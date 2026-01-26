const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
// const { PrismaClient } = require('@prisma/client');
const { db } = require('../services/db'); // Use Supabase Wrapper
const { supabase, supabaseAdmin } = require('../services/supabaseClient');
// const { uploadToDrive } = require('../services/googleDrive');
const { appendToSheet } = require('../services/googleSheets');

// Lazy load heavy dependencies inside routes to prevent startup crash (502)
// const { analyzeCandidate } = require('../services/aiAnalysis');
// const pdfParse = require('pdf-parse');
// const { createFolder, uploadToDrive, downloadFromDrive } = require('../services/googleDrive');
// const { generateBiodataPDF, generateFullReport } = require('../services/reportGenerator');
// const { mergePDFs } = require('../services/pdfMerger');

const fs = require('fs');

console.log("DEBUG: candidate.js loaded. Dependencies will be lazy-loaded.");

// Prisma Alias
const prisma = db;

// Memory Storage for Serverless/Supabase Upload
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/candidates - Submit Application
// POST /api/candidates - Submit Application
router.post('/', upload.single('cv'), async (req, res) => {
    try {
        const {
            fullName, email, phone, position, religion, bloodType, address,
            nik, simOwnership, simNumber, medicalHistory, // New fields
            experience, education, // Arrays
            strengths, weaknesses, biggestAchievement, otherInfo,
            // Rels
            vacancyId
        } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'CV file is required' });

        // DUPLICATE CHECK
        const existingCandidate = await prisma.candidate.findUnique({
            where: { email }
        });

        if (existingCandidate) {
            console.warn(`Duplicate submission attempt for email: ${email}`);
            return res.status(409).json({ error: 'Email sudah terdaftar. Mohon gunakan email lain atau hubungi admin.' });
        }

        console.log(`Received application from ${fullName} for ${position} (VacID: ${vacancyId})`);

        // --- PARALLEL PROCESSING START ---
        // We run Supabase Upload, Google Drive Upload, and OCR concurrently to save time.

        // Task A: Supabase Upload (Critical for initial file URL)
        const taskSupabase = (async () => {
            const fileExt = path.extname(file.originalname);
            const fileName = `${Date.now()}_${fullName.replace(/\s+/g, '_')}${fileExt}`;

            const { data, error } = await supabaseAdmin.storage
                .from('resumes')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error("Supabase Upload Error:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('resumes')
                .getPublicUrl(fileName);

            return { url: publicUrl, fileName };
        })();

        // Task B: Google Drive Upload (Optional - Fail safe)
        const taskDrive = (async () => {
            try {
                // Lazy Load
                const { createFolder, uploadToDrive } = require('../services/googleDrive');
                const tempDir = require('os').tmpdir();
                // Unique temp file to prevent collisions in parallel execution
                const tempFilePath = path.join(tempDir, `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
                fs.writeFileSync(tempFilePath, file.buffer);

                const folderName = `${fullName} - ${position || 'Applicant'}`;
                const driveFolderId = await createFolder(folderName);
                if (!driveFolderId) console.warn("Using Root Drive Folder");

                const driveFileName = `CV - ${fullName}.pdf`;
                const driveResult = await uploadToDrive(tempFilePath, driveFileName, driveFolderId);

                fs.unlinkSync(tempFilePath); // Cleanup

                if (driveResult && driveResult.id && !driveResult.error) {
                    return { id: driveResult.id, webViewLink: driveResult.webViewLink };
                }
                return null;
            } catch (e) {
                console.warn("Drive Task Failed:", e.message);
                return null;
            }
        })();

        // Task C: OCR (Optional - Fail safe)
        const taskOCR = (async () => {
            try {
                const pdfParse = require('pdf-parse');
                const data = await pdfParse(file.buffer);
                console.log("OCR Success, text length:", data.text.length);
                return data.text;
            } catch (e) {
                console.warn("OCR Task Failed:", e.message);
                return "[OCR Failed: " + e.message + "]";
            }
        })();

        // AWAIT ALL TASKS
        // If Supabase fails, the whole request fails (caught by main catch). 
        // Drive and OCR handle their own errors and return null/string.
        const [supabaseResult, driveResult, cvText] = await Promise.all([
            taskSupabase,
            taskDrive,
            taskOCR
        ]);

        let finalCvUrl = supabaseResult.url;
        let driveId = null;

        if (driveResult) {
            driveId = driveResult.id;
            if (driveResult.webViewLink) finalCvUrl = driveResult.webViewLink;

            // Delete from Supabase Storage if Drive success (Space saving)
            // Fire-and-forget to not block response
            if (!driveId.toString().startsWith('mock_')) {
                supabaseAdmin.storage
                    .from('resumes')
                    .remove([supabaseResult.fileName])
                    .then(() => console.log(`[Cleanup] Deleted ${supabaseResult.fileName} from Supabase`))
                    .catch(e => console.error("[Cleanup Warning]", e));
            }
        }

        // --- SINGLE DATABASE INSERT ---
        // Create candidate with ALL data populated at once.
        const candidate = await prisma.candidate.create({
            data: {
                fullName, email, phone, position, religion, bloodType, address,
                nik, simOwnership, simNumber, medicalHistory,
                experience: experience ? (typeof experience === 'string' ? JSON.parse(experience) : experience) : [],
                education: education ? (typeof education === 'string' ? JSON.parse(education) : education) : [],
                strengths: strengths ? (typeof strengths === 'string' ? JSON.parse(strengths) : strengths) : [],
                weaknesses: weaknesses ? (typeof weaknesses === 'string' ? JSON.parse(weaknesses) : weaknesses) : [],
                biggestAchievement,
                otherInfo,
                vacancyId,

                // DATA FROM PARALLEL TASKS
                cvUrl: finalCvUrl,
                cvDriveId: driveId || null,
                cvText: cvText || ""
            }
        });

        res.json({ success: true, candidateId: candidate.id });

    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// POST /api/candidates/:id/disc - Submit DISC Result
router.post('/:id/disc', async (req, res) => {
    try {
        const { id } = req.params;
        const { dScore, iScore, sScore, cScore, profile, answers, fullResult } = req.body;

        const discResult = await prisma.discResult.create({
            data: {
                candidateId: parseInt(id),
                dScore, iScore, sScore, cScore,
                profile,
                answers: JSON.stringify(answers),
                fullResult
            }
        });

        // AI Analysis Trigger removed from here. 
        // It will be triggered after Aptitude Test submission.

        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting DISC:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/candidates/:id/aptitude - Submit Aptitude Result & Trigger Final AI Analysis
router.post('/:id/aptitude', async (req, res) => {
    try {
        const { id } = req.params;
        const { score, correctCount, totalCount, answers } = req.body;

        // 1. Save Aptitude Result
        // Use db wrapper because Prisma Schema hasn't been re-generated for the new table

        const aptitudeResult = await db.aptitudeResult.create({
            data: {
                candidateId: parseInt(id),
                score, correctCount, totalCount,
                answers // Pass raw object, db wrapper handles it
            }
        });

        // 2. Trigger AI Analysis (BACKGROUND PROCESS)
        // Fire-and-forget: Return response immediately to prevent timeout
        (async () => {
            try {
                // Use Admin Privilege to ensure we get DISC/Aptitude results even if RLS hides them
                const candidate = await prisma.candidate.findUnique({
                    where: { id: parseInt(id) },
                    useAdmin: true
                });

                if (candidate) {
                    console.log(`Starting Final Deep Analysis for ${candidate.fullName}...`);

                    // LAZY LOAD DEPENDENCIES
                    const { analyzeCandidate } = require('../services/aiAnalysis');
                    const pdfParse = require('pdf-parse');
                    const { downloadFromDrive, createFolder, uploadToDrive } = require('../services/googleDrive');
                    const { generateBiodataPDF, generateAnalysisPDF } = require('../services/reportGenerator');
                    const { mergePDFs } = require('../services/pdfMerger');
                    const { sendNotification } = require('../services/whatsapp');
                    const { getSettings } = require('../services/settings');

                    // A. Get OCR Text
                    let cvText = candidate.cvText;
                    if (!cvText || cvText.length < 50) {
                        try {
                            console.log("CV Text missing in DB, trying to fetch...");
                            let buffer = null;
                            if (candidate.cvDriveId) {
                                const { downloadFromDrive } = require('../services/googleDrive');
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
                            console.error("OCR Retry Failed:", e);
                        }
                    }

                    // B. AI Analysis
                    let analysisData;
                    try {
                        analysisData = await analyzeCandidate(candidate, cvText || "No CV Text", candidate.discResult || {}, aptitudeResult);
                    } catch (err) {
                        console.error("Analysis Failed:", err);
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
                            candidateId: parseInt(id),
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
                    console.log(`Analysis saved for ${candidate.fullName}`);

                    // D. Integrations (Sheets & WhatsApp)
                    try {
                        const { appendToSheet } = require('../services/googleSheets');
                        await appendToSheet({ ...candidate, discResult: candidate.discResult }, analysisData);
                    } catch (sheetErr) { console.warn("Google Sheet failed:", sheetErr.message); }

                    try {
                        const { getSettings } = require('../services/settings');
                        const { sendNotification } = require('../services/whatsapp');
                        const settings = await getSettings();
                        await sendNotification({ ...candidate, discResult: candidate.discResult }, analysisData, settings);
                    } catch (waErr) { console.warn("WhatsApp failed:", waErr.message); }

                    // E. Generate MERGED Report PDF
                    try {
                        console.log("Generating and Merging Full Report...");

                        // 1. Generate Parts
                        // Note: formatting candidate data for generator
                        const candidateDataForReport = {
                            ...candidate,
                            strengths: typeof candidate.strengths === 'string' ? JSON.parse(candidate.strengths) : candidate.strengths,
                            weaknesses: typeof candidate.weaknesses === 'string' ? JSON.parse(candidate.weaknesses) : candidate.weaknesses
                        };

                        const { generateBiodataPDF, generateAnalysisPDF } = require('../services/reportGenerator');

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
                                console.log("Downloaded Original CV from Drive for Merging.");
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

                        // 3. Merge: [Biodata] + [CV] + [Analysis]
                        const { mergePDFs } = require('../services/pdfMerger');
                        const buffersToMerge = [biodataPdfBuffer];

                        if (originalCvBuffer) {
                            console.log("Adding Original CV to merge list...");
                            buffersToMerge.push(originalCvBuffer);
                        } else {
                            console.warn("Original CV buffer missing, skipping CV in report.");
                        }

                        buffersToMerge.push(analysisPdfBuffer);

                        let finalPdfBuffer = null;
                        try {
                            finalPdfBuffer = await mergePDFs(buffersToMerge);
                        } catch (mergeErr) {
                            console.error("Merge Failed (likely corrupt CV PDF). Fallback to Biodata + Analysis.", mergeErr.message);
                            // Fallback: Skip CV
                            finalPdfBuffer = await mergePDFs([biodataPdfBuffer, analysisPdfBuffer]);
                        }

                        // 4. Upload to Drive (In the User's Folder)
                        // Ensure folder structure is correct.
                        // We need the folder ID. We can try to find or create.
                        const folderName = `${candidate.fullName} - ${candidate.position || 'Applicant'}`;
                        const folderId = await createFolder(folderName);

                        const finalFileName = `Full Report - ${candidate.fullName}.pdf`;
                        const tempPath = path.join(require('os').tmpdir(), finalFileName);
                        fs.writeFileSync(tempPath, finalPdfBuffer);

                        await uploadToDrive(tempPath, finalFileName, folderId);
                        console.log("Full Merged Report Uploaded Successfully.");

                        fs.unlinkSync(tempPath);

                    } catch (e) {
                        console.error("Report Generation/Merge failed", e);
                    }
                }
            } catch (bgError) {
                console.error("Background Analysis Error:", bgError);
            }
        })();

        // Return immediately
        res.json({ success: true, message: 'Test submitted, analysis processing in background' });

    } catch (error) {
        console.error('Error submitting Aptitude:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/candidates/:id - Delete Candidate
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.candidate.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Candidate deleted' });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ error: 'Error deleting candidate' });
    }
});

// GET /api/candidates - Admin List
router.get('/', async (req, res) => {
    try {
        // Use Admin privilege for dashboard list
        const candidates = await prisma.candidate.findMany({ useAdmin: true });

        // db.candidate.findMany already includes and maps analysis/discResult
        res.json(candidates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching candidates' });
    }
});

// GET /api/candidates/:id - Get Single Candidate
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const candidate = await prisma.candidate.findUnique({
            where: { id: parseInt(id) },
            useAdmin: true // Ensure we get protected relations
        });

        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.json(candidate);
    } catch (error) {
        console.error('Error fetching candidate:', error);
        res.status(500).json({ error: 'Error fetching candidate' });
    }
});

// PATCH /api/candidates/:id/status - Update Status (Kanban Move)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await prisma.candidate.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating candidate status:', error);
        res.status(500).json({ error: 'Error updating status' });
    }
});

// POST /api/candidates/:id/link-request - Link to Manpower Request
router.post('/:id/link-request', async (req, res) => {
    try {
        const { id } = req.params;
        const { requestId } = req.body;

        // In Supabase, this is just an update to the request_id column
        // But since our db.candidate.update wrapper might not handle request_id explicitly mapped, 
        // we might need to handle it.
        // Let's check db.js wrap -> It maps standard fields. We should add request_id there or do raw update.
        // For safety/speed, let's use the underlying supabase client if db.js doesn't support it, 
        // or update db.js. 
        // Checking db.js... update() only maps specific fields.

        // Let's do a direct Supabase update here for standard 'request_id' column
        const { error } = await supabase
            .from('candidates')
            .update({ request_id: parseInt(requestId) })
            .eq('id', parseInt(id));

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error linking request:', error);
        res.status(500).json({ error: 'Error linking request' });
    }
});

module.exports = router;
