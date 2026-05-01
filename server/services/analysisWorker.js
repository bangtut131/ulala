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
        let pdfBuffer = null; // Keep buffer for Gemini Vision fallback

        if (!cvText || cvText.length < 50) {
            try {
                console.log("[Worker] CV Text missing, trying to fetch...");
                if (candidate.cvDriveId) {
                    pdfBuffer = await downloadFromDrive(candidate.cvDriveId);
                } else if (candidate.cvUrl) {
                    await logProgress(candidateId, "Downloading CV from Storage...");
                    const urlParts = candidate.cvUrl.split('/resumes/');
                    if (urlParts.length > 1) {
                        const { data: blob } = await supabase.storage.from('resumes').download(urlParts[1]);
                        if (blob) pdfBuffer = Buffer.from(await blob.arrayBuffer());
                    }
                }

                if (pdfBuffer) {
                    // Step 1: Try pdf-parse first (fast, free — works for text-based PDFs)
                    await logProgress(candidateId, "Starting PDF Parse (Text Extraction)...");
                    try {
                        const data = await pdfParse(pdfBuffer);
                        cvText = data.text;
                    } catch (parseErr) {
                        console.warn("[Worker] pdf-parse failed:", parseErr.message);
                        cvText = "";
                    }

                    // Step 2: If pdf-parse failed, try Tesseract.js OCR (no AI needed)
                    if (!cvText || cvText.trim().length < 50) {
                        await logProgress(candidateId, "Text extraction empty. Trying Tesseract OCR (non-AI)...");
                        try {
                            const { ocrPdfBuffer } = require('./ocrService');
                            const tesseractText = await ocrPdfBuffer(pdfBuffer, 5);
                            if (tesseractText && tesseractText.trim().length > 30) {
                                cvText = tesseractText;
                                console.log(`[Worker] Tesseract OCR extracted ${cvText.length} characters.`);
                                await logProgress(candidateId, `Tesseract OCR success (${cvText.length} chars).`);
                            } else {
                                console.warn("[Worker] Tesseract OCR returned insufficient text.");
                                await logProgress(candidateId, "Tesseract OCR insufficient. Trying AI Vision...");
                            }
                        } catch (tesseractErr) {
                            console.warn("[Worker] Tesseract OCR failed:", tesseractErr.message);
                            await logProgress(candidateId, "Tesseract OCR unavailable. Trying AI Vision...");
                        }
                    }

                    // Step 3: Last resort — AI Vision OCR (requires API key)
                    if (!cvText || cvText.trim().length < 50) {
                        await logProgress(candidateId, "Using AI Vision OCR as last resort...");
                        try {
                            const settings = await getSettings();
                            const apiKey = settings.geminiApiKey;
                            const ocrPrompt = "Extract ALL text content from this PDF/CV document. Return the raw text only, no formatting or commentary. Include all personal info, education, work experience, skills, and any other content visible in the document. If the document is in Indonesian, keep it in Indonesian.";
                            const base64Pdf = pdfBuffer.toString('base64');
                            let visionText = '';

                            // Try Gemini first (best for Vision OCR)
                            const geminiKey = process.env.GEMINI_API_KEY || (settings.aiProvider !== 'custom' ? apiKey : null);

                            if (geminiKey && geminiKey !== '') {
                                console.log("[Worker] Attempting Gemini Vision OCR...");
                                const { GoogleGenerativeAI } = require("@google/generative-ai");
                                const genAI = new GoogleGenerativeAI(geminiKey);
                                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                                const result = await model.generateContent([
                                    { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
                                    ocrPrompt
                                ]);
                                const response = await result.response;
                                visionText = response.text();

                            } else if (apiKey && settings.aiProvider === 'custom') {
                                // Fallback: OpenAI-compatible provider with vision
                                console.log("[Worker] Attempting OpenAI-compatible Vision OCR...");
                                const OpenAI = require("openai");
                                const openai = new OpenAI({
                                    apiKey: apiKey,
                                    baseURL: settings.aiBaseUrl || "https://api.openai.com/v1",
                                });

                                const completion = await openai.chat.completions.create({
                                    messages: [{
                                        role: "user",
                                        content: [
                                            { type: "text", text: ocrPrompt },
                                            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64Pdf}` } }
                                        ]
                                    }],
                                    model: settings.aiModel || "gpt-4o-mini",
                                });
                                visionText = completion.choices[0].message.content;
                            }

                            if (visionText && visionText.trim().length > 30) {
                                cvText = visionText;
                                console.log(`[Worker] AI Vision OCR extracted ${cvText.length} characters.`);
                                await logProgress(candidateId, `AI Vision OCR success (${cvText.length} chars).`);
                            } else {
                                console.warn("[Worker] AI Vision returned insufficient text.");
                                await logProgress(candidateId, "All OCR methods failed. CV text unavailable.");
                            }
                        } catch (visionErr) {
                            console.error("[Worker] AI Vision OCR failed:", visionErr.message);
                            await logProgress(candidateId, "AI Vision OCR failed: " + visionErr.message);
                        }
                    }

                    // Save extracted text to DB
                    if (cvText && cvText.trim().length > 10) {
                        await prisma.candidate.update({
                            where: { id: candidate.id },
                            data: { cvText: cvText }
                        });
                    }
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
        // Pre-create/find the candidate folder for linking in the spreadsheet
        let candidateFolderId = null;
        try {
            const folderName = `${candidate.fullName} - ${candidate.position || 'Applicant'}`;
            candidateFolderId = await createFolder(folderName);
        } catch (folderErr) { console.warn("[Worker] Folder lookup warning:", folderErr.message); }

        try {
            const { appendToSheet } = require('./googleSheets');
            await appendToSheet({ ...candidate, discResult: candidate.discResult }, analysisData, candidateFolderId);
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
