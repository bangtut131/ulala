const { db } = require('./db');
const { supabase, supabaseAdmin } = require('./supabaseClient');
const prisma = db;

// Helper to log progress to DB for Admin visibility
async function logProgress(candidateId, message) {
    try {
        console.log(`[Worker] ${message}`);
        // Fetch current info first to append
        const c = await prisma.candidate.findUnique({ where: { id: parseInt(candidateId) }, select: { otherInfo: true } });
        const newLog = `\n[Log ${new Date().toLocaleTimeString()}] ${message}`;
        await prisma.candidate.update({
            where: { id: parseInt(candidateId) },
            data: { otherInfo: (c?.otherInfo || "") + newLog }
        });
    } catch (e) {
        console.warn("Failed to write log to DB:", e.message);
    }
}

// Heavy analysis logic encapsulated for Background Execution
async function runAnalysis(candidateId, aptitudeResultId = null) {
    try {
        await logProgress(candidateId, "Worker Started");

        // 1. Fetch Candidate with Admin Privilege
        const candidate = await prisma.candidate.findUnique({
            where: { id: parseInt(candidateId) },
            useAdmin: true
        });

        if (!candidate) {
            console.error(`[Worker] Candidate ${candidateId} not found.`);
            return;
        }

        // Fetch Aptitude Result if provided
        let aptitudeResult = null;
        if (aptitudeResultId) {
            // Fix: db.aptitudeResult might not have findUnique. Use safe approach.
            try {
                if (prisma.aptitudeResult.findUnique) {
                    aptitudeResult = await prisma.aptitudeResult.findUnique({ where: { id: parseInt(aptitudeResultId) } });
                } else {
                    // Fallback 1: Use Supabase directly for speed
                    const { data } = await supabase
                        .from('aptitude_results')
                        .select('*')
                        .eq('id', parseInt(aptitudeResultId))
                        .single();

                    if (data) {
                        // Map to camelCase if needed, though worker checks specific fields usually
                        aptitudeResult = {
                            id: data.id,
                            score: data.score,
                            correctCount: data.correct_count,
                            totalCount: data.total_count,
                            answers: data.answers
                        };
                    }
                }
            } catch (e) {
                console.warn("[Worker] Failed to fetch aptitude result safely:", e);
            }
        }

        console.log(`[Worker] Processing ${candidate.fullName}...`);

        // LAZY LOAD DEPENDENCIES (To save memory)
        const { analyzeCandidate } = require('./aiAnalysis');
        const pdfParse = require('pdf-parse');
        const { downloadFromDrive, createFolder, uploadToDrive } = require('./googleDrive');
        const { generateBiodataPDF, generateAnalysisPDF } = require('./reportGenerator');
        const { mergePDFs } = require('./pdfMerger');
        const { sendNotification } = require('./whatsapp');
        const { getSettings } = require('./settings');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        // A. Get OCR Text
        let cvText = candidate.cvText;
        if (!cvText || cvText.length < 50) {
            try {
                console.log("[Worker] CV Text missing, trying to fetch...");
                let buffer = null;
                if (candidate.cvDriveId) {
                    buffer = await downloadFromDrive(candidate.cvDriveId);
                } else if (candidate.cvUrl) {
                    await logProgress(candidateId, "Downloading CV from Storage...");
                    const urlParts = candidate.cvUrl.split('/resumes/');
                    if (urlParts.length > 1) {
                        const { data: blob } = await supabase.storage.from('resumes').download(urlParts[1]);
                        if (blob) buffer = Buffer.from(await blob.arrayBuffer());
                    }
                }

                if (buffer) {
                    await logProgress(candidateId, "Starting PDF Parse (OCR)...");
                    const data = await pdfParse(buffer);
                    cvText = data.text;
                    // Update Candidate
                    await prisma.candidate.update({
                        where: { id: candidate.id },
                        data: { cvText: cvText }
                    });
                }
            } catch (e) {
                console.error("[Worker] OCR Retry Failed:", e);
            }
        }

        // B. AI Analysis
        let analysisData;
        try {
            await logProgress(candidateId, "Starting AI Analysis...");
            analysisData = await analyzeCandidate(candidate, cvText || "No CV Text", candidate.discResult || {}, aptitudeResult);
            await logProgress(candidateId, "AI Analysis Complete.");
        } catch (err) {
            console.error("[Worker] AI Analysis Failed:", err);
            analysisData = {
                matchScore: 0,
                content: "AI Analysis Failed. Error: " + err.message,
                verdict: "Error",
                details: {}
            };
        }

        // C. Save Analysis (Delete old one first to prevent duplicates on regenerate)
        console.log("[Worker] Saving Analysis to DB...");
        try {
            await supabaseAdmin
                .from('analyses')
                .delete()
                .eq('candidate_id', parseInt(candidateId));
            console.log("[Worker] Old analysis deleted.");
        } catch (delErr) {
            console.warn("[Worker] Could not delete old analysis (may not exist):", delErr.message);
        }

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

        // D. Integrations
        try {
            const { appendToSheet } = require('./googleSheets');
            await appendToSheet({ ...candidate, discResult: candidate.discResult }, analysisData);
            console.log("[Worker] Google Sheet updated.");
        } catch (sheetErr) { console.warn("[Worker] Google Sheet warning:", sheetErr.message); }

        try {
            const settings = await getSettings();
            await sendNotification({ ...candidate, discResult: candidate.discResult }, analysisData, settings, aptitudeResult);
            console.log("[Worker] WhatsApp notification sent.");
        } catch (waErr) { console.warn("[Worker] WhatsApp warning:", waErr.message); }

        // E. Generate MERGED Report PDF
        try {
            console.log("[Worker] Generating Reports...");

            const candidateDataForReport = {
                ...candidate,
                strengths: typeof candidate.strengths === 'string' ? JSON.parse(candidate.strengths) : candidate.strengths,
                weaknesses: typeof candidate.weaknesses === 'string' ? JSON.parse(candidate.weaknesses) : candidate.weaknesses
            };

            // Part A: Biodata
            const biodataPdfBuffer = await generateBiodataPDF(candidateDataForReport);

            // Part C: Analysis
            const analysisPdfBuffer = await generateAnalysisPDF(
                candidateDataForReport,
                candidate.discResult,
                aptitudeResult,
                analysisData
            );

            // Part B: Original CV
            let originalCvBuffer = null;
            if (candidate.cvDriveId) {
                try {
                    originalCvBuffer = await downloadFromDrive(candidate.cvDriveId);
                } catch (dlErr) { console.error("[Worker] CV Download failed:", dlErr.message); }
            } else if (candidate.cvUrl) {
                try {
                    const urlParts = candidate.cvUrl.split('/resumes/');
                    if (urlParts.length > 1) {
                        const { data: blob } = await supabase.storage.from('resumes').download(urlParts[1]);
                        if (blob) originalCvBuffer = Buffer.from(await blob.arrayBuffer());
                    }
                } catch (sbErr) { console.error("[Worker] CV Download from storage failed:", sbErr.message); }
            }

            // Merge
            const buffersToMerge = [biodataPdfBuffer];
            if (originalCvBuffer) buffersToMerge.push(originalCvBuffer);
            buffersToMerge.push(analysisPdfBuffer);

            let finalPdfBuffer = null;
            try {
                finalPdfBuffer = await mergePDFs(buffersToMerge);
            } catch (mergeErr) {
                console.error("[Worker] Merge Failed, falling back...", mergeErr.message);
                finalPdfBuffer = await mergePDFs([biodataPdfBuffer, analysisPdfBuffer]);
            }

            // Upload
            const folderName = `${candidate.fullName} - ${candidate.position || 'Applicant'}`;
            const folderId = await createFolder(folderName);
            const finalFileName = `Full Report - ${candidate.fullName}.pdf`;

            const tempPath = path.join(os.tmpdir(), finalFileName);
            fs.writeFileSync(tempPath, finalPdfBuffer);

            await uploadToDrive(tempPath, finalFileName, folderId);
            console.log("[Worker] PDF Report Generated and Uploaded.");

            fs.unlinkSync(tempPath);

        } catch (e) {
            console.error("[Worker] Report Generation failed:", e);
        }

        console.log("[Worker] Job Completed Successfully.");
        return { success: true };

    } catch (error) {
        console.error("[Worker] Critical Error:", error);
        await logProgress(candidateId, "CRITICAL FAILED: " + error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { runAnalysis };
