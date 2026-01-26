// netlify/functions/process-analysis-background.js
// NETLIFY BACKGROUND FUNCTION - Runs for up to 15 minutes
// Triggers automatically on request.

const { analyzeCandidate } = require('../../server/services/aiAnalysis');
const { downloadFromDrive, createFolder, uploadToDrive } = require('../../server/services/googleDrive');
const { generateBiodataPDF, generateAnalysisPDF } = require('../../server/services/reportGenerator');
const { mergePDFs } = require('../../server/services/pdfMerger');
const { sendNotification } = require('../../server/services/whatsapp');
const { getSettings } = require('../../server/services/settings');
const { appendToSheet } = require('../../server/services/googleSheets');
const { PrismaClient } = require('@prisma/client');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

// Initialize Prisma
const prisma = new PrismaClient();

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        const { candidateId } = payload;

        console.log(`[Background Worker] Job Started for Candidate ID: ${candidateId}`);

        // 1. Fetch Candidate with Full Data
        const candidate = await prisma.candidate.findUnique({
            where: { id: parseInt(candidateId) },
        });

        if (!candidate) {
            console.error(`Candidate ${candidateId} not found.`);
            return { statusCode: 404, body: 'Candidate not found' };
        }

        // 2. OCR Text Analysis
        let cvText = candidate.cvText;
        if (!cvText || cvText.length < 50 || cvText.startsWith("[OCR Failed")) {
            try {
                console.log("OCR Text missing, fetching...");
                let buffer = null;
                // Reuse existing download logic if possible or reimplement simple fetch
                if (candidate.cvDriveId) {
                    buffer = await downloadFromDrive(candidate.cvDriveId);
                }

                if (buffer) {
                    const data = await pdfParse(buffer);
                    cvText = data.text;
                    await prisma.candidate.update({
                        where: { id: candidate.id },
                        data: { cvText: cvText }
                    });
                }
            } catch (e) { console.error("OCR Retry Failed:", e.message); }
        }

        // 3. Fetch Relations (DISC/Apptitude) manually since we used raw Prisma
        const candidateFull = await prisma.candidate.findUnique({
            where: { id: parseInt(candidateId) },
            include: {
                discResult: true,
                aptitudeResult: true
            }
        });

        const discResult = Array.isArray(candidateFull.discResult) ? candidateFull.discResult[0] : candidateFull.discResult;
        const aptitudeResult = Array.isArray(candidateFull.aptitudeResult) ? candidateFull.aptitudeResult[0] : candidateFull.aptitudeResult;

        // 4. Run AI Analysis
        console.log("Running AI Analysis...");
        const analysisData = await analyzeCandidate(
            candidateFull,
            cvText || "No CV Text",
            discResult || {},
            aptitudeResult || {}
        );

        // 5. Save Analysis
        console.log("Saving Analysis...");
        await prisma.analysis.create({
            data: {
                candidateId: candidateFull.id,
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

        // 6. Generate Report PDF & Upload
        console.log("Generating PDFs...");
        const candidateDataForReport = { ...candidateFull, strengths: JSON.parse(candidateFull.strengths || '[]'), weaknesses: JSON.parse(candidateFull.weaknesses || '[]') };

        const biodataPdfBuffer = await generateBiodataPDF(candidateDataForReport);
        const analysisPdfBuffer = await generateAnalysisPDF(candidateDataForReport, discResult, aptitudeResult, analysisData);

        let originalCvBuffer = null;
        if (candidateFull.cvDriveId) {
            try { originalCvBuffer = await downloadFromDrive(candidateFull.cvDriveId); }
            catch (e) { console.log("CV Download failed", e.message); }
        }

        const buffersToMerge = [biodataPdfBuffer];
        if (originalCvBuffer) buffersToMerge.push(originalCvBuffer);
        buffersToMerge.push(analysisPdfBuffer);

        const finalPdfBuffer = await mergePDFs(buffersToMerge);

        // Upload
        const folderName = `${candidateFull.fullName} - ${candidateFull.position || 'Applicant'}`;
        const folderId = await createFolder(folderName);
        const finalFileName = `Full Report - ${candidateFull.fullName}.pdf`;
        const tempPath = path.join('/tmp', finalFileName); // Netlify uses /tmp
        fs.writeFileSync(tempPath, finalPdfBuffer);
        await uploadToDrive(tempPath, finalFileName, folderId);
        fs.unlinkSync(tempPath);

        // 7. Integrations
        const settings = await getSettings();
        await sendNotification({ ...candidateFull, discResult }, analysisData, settings);
        await appendToSheet({ ...candidateFull, discResult }, analysisData);

        console.log("[Background Worker] Success!");
        return { statusCode: 200, body: "Analysis Complete" };

    } catch (error) {
        console.error("[Background Worker] Error:", error);
        return { statusCode: 500, body: JSON.stringify(error) };
    }
};
