const { PrismaClient } = require('@prisma/client');
const { db } = require('./db'); // Use wrapper if needed, but worker usually needs direct access or consistent access
const prisma = db; // Re-use the existing db connection

const { analyzeCandidate } = require('./aiAnalysis');
const pdfParse = require('pdf-parse');
const { downloadFromDrive, createFolder, uploadToDrive } = require('./googleDrive');
const { generateBiodataPDF, generateAnalysisPDF } = require('./reportGenerator');
const { mergePDFs } = require('./pdfMerger');
const { sendNotification } = require('./whatsapp');
const { getSettings } = require('./settings');
const { appendToSheet } = require('./googleSheets');
const { supabase } = require('./supabaseClient');

const fs = require('fs');
const path = require('path');

async function runAnalysis(candidateId, aptitudeResultId = null) {
    try {
        console.log(`[Worker] Starting Analysis for Candidate ID: ${candidateId}`);

        // 1. Fetch Candidate with Admin Privilege
        const candidate = await prisma.candidate.findUnique({
            where: { id: parseInt(candidateId) },
            useAdmin: true
        });

        if (!candidate) {
            console.error(`[Worker] Candidate ${candidateId} not found.`);
            return;
        }

        // If aptitudeResult is passed via ID (optional, usually attached to candidate or fetched)
        // But in our flow, we just saved it.
        // Let's refetch aptitudeResult to be sure
        let aptitudeResult = null;
        if (aptitudeResultId) {
            aptitudeResult = await prisma.aptitudeResult.findUnique({ where: { id: parseInt(aptitudeResultId) } });
        } else {
            // Try to find the latest
            const aptResults = await prisma.aptitudeResult.findMany({
                where: { candidateId: parseInt(candidateId) },
                orderBy: { createdAt: 'desc' },
                take: 1
            });
            aptitudeResult = aptResults[0];
        }

        if (!aptitudeResult) {
            console.warn(`[Worker] Aptitude Result not found for ${candidate.fullName}. Proceeding with partial data.`);
        }

        console.log(`[Worker] Analyzing: ${candidate.fullName}`);

        // A. Get OCR Text
        let cvText = candidate.cvText;
        if (!cvText || cvText.length < 50) {
            try {
                console.log("[Worker] CV Text missing in DB, trying to fetch...");
                let buffer = null;
                if (candidate.cvDriveId) {
                    buffer = await downloadFromDrive(candidate.cvDriveId);
                } else if (candidate.cvUrl) {
                    const urlParts = candidate.cvUrl.split('/resumes/');
                    if (urlParts.length > 1) {
                        const { data: blob } = await supabase.storage.from('resumes').download(urlParts[1]);
                        if (blob) buffer = Buffer.from(await blob.arrayBuffer());
                    }
                }

                if (buffer) {
                    const data = await pdfParse(buffer);
                    cvText = data.text;
                    await prisma.candidate.update({
                        where: { id: candidate.id },
                        data: { cvText: cvText }
                    });
                }
            } catch (e) {
                console.error("[Worker] OCR Retry Failed:", e.message);
            }
        }

        // B. AI Analysis
        let analysisData;
        try {
            analysisData = await analyzeCandidate(candidate, cvText || "No CV Text", candidate.discResult || {}, aptitudeResult);
        } catch (err) {
            console.error("[Worker] Analysis Failed:", err);
            analysisData = {
                matchScore: 0,
                content: "AI Analysis Failed. Error: " + err.message,
                verdict: "Error",
                details: {}
            };
        }

        // C. Save Analysis
        await prisma.analysis.create({
            data: {
                candidateId: parseInt(candidateId),
                matchScore: analysisData.matchScore,
                content: analysisData.content,
                verdict: analysisData.verdict,
                ocrText: cvText ? cvText.substring(0, 5000) : '',
                cvScore: analysisData.details?.cvScore || 0,
                discScore: analysisData.details?.discScore || 0,
                aptitudeScore: analysisData.details?.aptitudeScore || 0,
                personalDataScore: analysisData.details?.personalDataScore || 0
            }
        });
        console.log(`[Worker] Analysis saved for ${candidate.fullName}`);

        // D. Integrations (Sheets & WhatsApp)
        try {
            await appendToSheet({ ...candidate, discResult: candidate.discResult }, analysisData);
        } catch (sheetErr) { console.warn("[Worker] Google Sheet failed:", sheetErr.message); }

        try {
            const settings = await getSettings();
            await sendNotification({ ...candidate, discResult: candidate.discResult }, analysisData, settings);
        } catch (waErr) { console.warn("[Worker] WhatsApp failed:", waErr.message); }

        // E. Generate MERGED Report PDF
        try {
            console.log("[Worker] Generating and Merging Full Report...");

            const candidateDataForReport = {
                ...candidate,
                strengths: typeof candidate.strengths === 'string' ? JSON.parse(candidate.strengths) : candidate.strengths,
                weaknesses: typeof candidate.weaknesses === 'string' ? JSON.parse(candidate.weaknesses) : candidate.weaknesses
            };

            // Part A: Biodata
            const biodataPdfBuffer = await generateBiodataPDF(candidateDataForReport);

            // Part C: Analysis (DISC + Aptitude + AI)
            const analysisPdfBuffer = await generateAnalysisPDF(
                candidateDataForReport,
                candidate.discResult,
                aptitudeResult,
                analysisData
            );

            // Part B: Original CV (Download)
            let originalCvBuffer = null;
            if (candidate.cvDriveId) {
                try {
                    originalCvBuffer = await downloadFromDrive(candidate.cvDriveId);
                } catch (dlErr) { console.error("Could not download CV from Drive:", dlErr.message); }
            } else if (candidate.cvUrl) {
                try {
                    const urlParts = candidate.cvUrl.split('/resumes/');
                    if (urlParts.length > 1) {
                        const { data: blob } = await supabase.storage.from('resumes').download(urlParts[1]);
                        if (blob) originalCvBuffer = Buffer.from(await blob.arrayBuffer());
                    }
                } catch (sbErr) { console.error("Could not download CV from Supabase:", sbErr.message); }
            }

            // Merge
            const buffersToMerge = [biodataPdfBuffer];
            if (originalCvBuffer) buffersToMerge.push(originalCvBuffer);
            buffersToMerge.push(analysisPdfBuffer);

            let finalPdfBuffer = null;
            try {
                finalPdfBuffer = await mergePDFs(buffersToMerge);
            } catch (mergeErr) {
                console.error("[Worker] Merge Failed. Fallback to Biodata + Analysis.", mergeErr.message);
                finalPdfBuffer = await mergePDFs([biodataPdfBuffer, analysisPdfBuffer]);
            }

            // Upload to Drive
            const folderName = `${candidate.fullName} - ${candidate.position || 'Applicant'}`;
            const folderId = await createFolder(folderName);
            const finalFileName = `Full Report - ${candidate.fullName}.pdf`;

            // Write to TEMP before upload
            const tempPath = path.join(require('os').tmpdir(), finalFileName);
            fs.writeFileSync(tempPath, finalPdfBuffer);

            await uploadToDrive(tempPath, finalFileName, folderId);
            console.log("[Worker] Full Merged Report Uploaded Successfully.");

            fs.unlinkSync(tempPath);

        } catch (e) {
            console.error("[Worker] Report Generation/Merge failed", e);
        }

        console.log(`[Worker] Job Complete for ${candidate.fullName}`);
        return { success: true };

    } catch (error) {
        console.error("[Worker] Fatal Error:", error);
        return { success: false, error: error.message };
    }
}

module.exports = { runAnalysis };
