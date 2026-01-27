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
        console.log("DEBUG PAYLOAD:", JSON.stringify(req.body)); // Debug missing fields

        // 1. Upload to Supabase Storage
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}_${fullName.replace(/\s+/g, '_')}${fileExt}`;

        const { data: storageData, error: storageError } = await supabaseAdmin
            .storage
            .from('resumes')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) {
            console.error("Supabase Storage Upload Error:", storageError);
            throw storageError;
        }

        const { data: { publicUrl: supabaseUrl } } = supabase
            .storage
            .from('resumes')
            .getPublicUrl(fileName);

        let finalCvUrl = supabaseUrl;

        // 2. Upload to Google Drive (Folder Based)
        let driveId = null;
        let driveFolderId = null;

        // LAZY LOAD
        const { createFolder, uploadToDrive } = require('../services/googleDrive');
        const pdfParse = require('pdf-parse');

        try {
            // Write buffer to temp file for Drive upload
            const tempDir = require('os').tmpdir();
            const tempFilePath = path.join(tempDir, fileName);
            fs.writeFileSync(tempFilePath, file.buffer);

            // A. Create/Get Folder
            const folderName = `${fullName} - ${position || 'Applicant'}`;
            driveFolderId = await createFolder(folderName);

            if (!driveFolderId) {
                console.warn("Using Root Drive Folder (Folder creation failed)");
            }

            // B. Upload CV to that Folder
            // Clean filename for Drive (remove timestamp if desired, or keep it)
            // User requested: "1. File pdf cv kandidat" - Let's keep it clear
            const driveFileName = `CV - ${fullName}.pdf`;

            const driveResult = await uploadToDrive(tempFilePath, driveFileName, driveFolderId);

            if (driveResult && driveResult.id && !driveResult.error) {
                driveId = driveResult.id;
                // Use Drive View Link if available
                if (driveResult.webViewLink) {
                    finalCvUrl = driveResult.webViewLink;
                }

                // Delete from Supabase Storage if successful (Space saving)
                if (!driveId.toString().startsWith('mock_')) {
                    console.log(`[Storage] Drive Upload Success (ID: ${driveId}). Deleting ${fileName} from Supabase...`);
                    // supabaseAdmin.storage.from('resumes').remove([fileName]); // Async cleanup
                }
            } else {
                console.warn("Google Drive Upload Incomplete:", driveResult.error || "No ID returned");
            }

            // Cleanup
            fs.unlinkSync(tempFilePath);
        } catch (driveErr) {
            console.warn("Google Drive Upload Skipped:", driveErr.message);
        }

        // 3. Save to Database
        const candidate = await prisma.candidate.create({
            data: {
                fullName,
                email,
                phone,
                position,
                religion,
                bloodType,
                address,

                // NEW FIELDS
                nik,
                simOwnership,
                simNumber,
                medicalHistory,
                experience: experience ? (typeof experience === 'string' ? JSON.parse(experience) : experience) : [],
                education: education ? (typeof education === 'string' ? JSON.parse(education) : education) : [],

                cvUrl: finalCvUrl,
                cvDriveId: driveId || null,
                strengths: strengths ? (typeof strengths === 'string' ? JSON.parse(strengths) : strengths) : [],
                weaknesses: weaknesses ? (typeof weaknesses === 'string' ? JSON.parse(weaknesses) : weaknesses) : [],
                biggestAchievement,
                vacancyId // Pass it
            }
        });

        // --- NEW: Generate & Upload Biodata PDF (Using Service) ---
        // --- NEW: Generate & Upload Biodata PDF (Using Service) ---
        // DISABLED per User Request (Only 2 files: Original CV + Full Merged Report)
        /*
        try {
            console.log("Generating Biodata PDF for:", fullName);

            // 1. Generate Buffer
            const biodataBuffer = await generateBiodataPDF({
                fullName, email, phone, position, religion, bloodType, address,
                nik, simOwnership, simNumber, medicalHistory,
                biggestAchievement, strengths, weaknesses
            });

            // 2. Save to Temp
            const biodataFileName = `Biodata - ${fullName} - ${position || 'Candidate'}.pdf`;
            const tempDir = require('os').tmpdir();
            const biodataPath = path.join(tempDir, biodataFileName);
            fs.writeFileSync(biodataPath, biodataBuffer);

            // 3. Upload to SAME Folder
            // Re-use driveFolderId from above if available
            console.log("Uploading Biodata PDF to Drive Folder:", driveFolderId);
            const bioUpload = await uploadToDrive(biodataPath, biodataFileName, driveFolderId); // Pass folderId

            if (bioUpload.error) {
                console.warn("DATA LOSS WARNING: Biodata PDF failed to upload to Drive:", bioUpload.error);
            } else {
                console.log("Biodata PDF uploaded successfully. ID:", bioUpload.id);
            }

            fs.unlinkSync(biodataPath);

        } catch (bioErr) {
            console.error("Biodata Generation/Upload Failed:", bioErr.message);
        }
        */

        // --- SYNCHRONOUS PROCESSING (Required for Netlify/Serverless) ---
        // We must await this because Netlify freezes the function immediately after res.json()
        try {
            // 3. OCR (Using Memory Buffer)
            console.log("Starting OCR for candidate:", candidate.fullName);
            let cvText = "";
            try {
                // Ensure buffer is available
                if (file.buffer) {
                    const data = await pdfParse(file.buffer);
                    cvText = data.text;
                    console.log("OCR Success, text length:", cvText.length);

                    // Update Candidate with extracted Text
                    await prisma.candidate.update({
                        where: { id: candidate.id },
                        data: { cvText: cvText }
                    });
                }
            } catch (e) {
                console.error("OCR Failed:", e);
                cvText = "[OCR Failed: " + e.message + "]";
            }

            // Note: We are NOT running full AI Analysis here anymore because it requires DISC results first.
            // The AI Analysis is triggered in the NEXT step (POST /:id/disc).
            // This endpoint only handles the INITIAL application (Personal Data + CV).

        } catch (err) {
            console.error("Processing error:", err);
        }

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
        // Reverted to direct in-process call as background function was unreliable.
        // This relies on the server staying alive long enough to complete.

        (async () => {
            const { runAnalysis } = require('../services/analysisWorker');
            console.log(`[Trigger] Running Analysis for ${id} (In-Process)`);

            // We await it here only inside the async wrapper. 
            // The main response (res.json) below fires immediately.
            try {
                await runAnalysis(parseInt(id), aptitudeResult.id);
            } catch (e) {
                console.error("[Trigger] Analysis Failed:", e);
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
