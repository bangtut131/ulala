const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { getSettings } = require('./settings');

const getAuthClient = async () => {
    const settings = await getSettings();
    if (!settings.googleClientId || !settings.googleClientSecret || !settings.googleRefreshToken) {
        return null;
    }
    try {
        const oAuth2Client = new google.auth.OAuth2(
            settings.googleClientId,
            settings.googleClientSecret,
            process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/api/auth/google/callback` : 'http://localhost:3000/api/auth/google/callback'
        );
        oAuth2Client.setCredentials({ refresh_token: settings.googleRefreshToken });
        return oAuth2Client;
    } catch (error) {
        console.error("Error creating auth client:", error);
        return null;
    }
};

async function getFolderId(folderName, parentId = null) {
    const auth = await getAuthClient();
    if (!auth) return null;

    const service = google.drive({ version: 'v3', auth });
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    try {
        const response = await service.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.data.files.length > 0) {
            return response.data.files[0].id;
        }
        return null;
    } catch (error) {
        console.error("Error finding folder:", error);
        return null;
    }
}

async function createFolder(folderName, parentId = null) {
    const settings = await getSettings();
    const auth = await getAuthClient();
    if (!auth) return null;

    // IF parentId is not provided, use the root folder from settings
    if (!parentId && settings.googleDriveId) {
        // Clean the ID if it's a URL
        const cleanId = (id) => {
            if (!id) return '';
            if (id.includes('/folders/')) return id.split('/folders/')[1].split('?')[0];
            if (id.includes('id=')) return id.split('id=')[1].split('&')[0];
            return id;
        };
        parentId = cleanId(settings.googleDriveId);
    }

    // Check if exists first
    const existingId = await getFolderId(folderName, parentId);
    if (existingId) return existingId;

    const service = google.drive({ version: 'v3', auth });

    // Safety check just in case parentId is still null/undefined (e.g. no settings)
    const parents = parentId ? [parentId] : [];

    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parents
    };

    try {
        const file = await service.files.create({
            resource: fileMetadata,
            fields: 'id'
        });
        console.log("Created Folder:", folderName, file.data.id);
        return file.data.id;
    } catch (error) {
        console.error("Error creating folder:", error);
        return null; // Return null on failure so we can fallback
    }
}

async function uploadToDrive(filePath, originalName, folderId = null) {
    const settings = await getSettings();
    const auth = await getAuthClient();

    if (!auth) {
        console.log(`[Mock] Uploading ${originalName} to Google Drive... (Missing Credentials)`);
        return { id: `mock_drive_id_${Date.now()}`, webViewLink: null, webContentLink: null };
    }

    // Use provided folderId, OR fallback to settings folderId
    let targetFolderId = folderId;
    if (!targetFolderId && settings.googleDriveId) {
        // Helper to extract ID from URL
        const cleanId = (id) => {
            if (!id) return '';
            if (id.includes('/folders/')) return id.split('/folders/')[1].split('?')[0];
            if (id.includes('id=')) return id.split('id=')[1].split('&')[0];
            return id;
        };
        targetFolderId = cleanId(settings.googleDriveId);
    }


    try {
        console.log(`[Drive] Uploading ${originalName} to Folder ${targetFolderId || 'Root'}...`);
        const service = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: originalName, // Use original name, user asked for clean names
            parents: targetFolderId ? [targetFolderId] : []
        };

        const media = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(filePath)
        };

        const file = await service.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
            supportsAllDrives: true
        });

        console.log('File Id:', file.data.id);
        return {
            id: file.data.id,
            webViewLink: file.data.webViewLink,
            webContentLink: file.data.webContentLink
        };

    } catch (error) {
        console.error('Google Drive Upload Error:', error.message);

        // Specific check for Quota/Permission errors common with Service Accounts
        if (error.code === 403 && (error.message.includes('storage quota') || error.message.includes('insufficient permissions'))) {
            console.error("CRITICAL: Service Account Storage Quota Exceeded or Permission Denied.");
        }

        return { id: null, error: error.message };
    }
}

async function downloadFromDrive(fileId) {
    const auth = await getAuthClient();
    if (!auth) throw new Error("No Google Auth credentials");

    const service = google.drive({ version: 'v3', auth });

    try {
        const response = await service.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );
        return Buffer.from(response.data);
    } catch (error) {
        console.error("Error downloading from Drive:", error);
        throw error;
    }
}

module.exports = { uploadToDrive, downloadFromDrive, createFolder };
