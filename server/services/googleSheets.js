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

async function appendToSheet(candidateData, analysisData = null) {
    const settings = await getSettings();
    const auth = await getAuthClient();

    if (!auth || !settings.googleSheetId) {
        console.log(`[Mock] Appending candidate to Sheets: ${candidateData.email} (Missing Credentials)`);
        // Return success mock so flow continues
        return true;
    }

    // Helper to extract ID from URL
    const cleanId = (id) => {
        if (!id) return '';
        if (id.includes('/spreadsheets/d/')) return id.split('/spreadsheets/d/')[1].split('/')[0];
        if (id.includes('key=')) return id.split('key=')[1].split('&')[0];
        return id;
    };

    const spreadsheetId = cleanId(settings.googleSheetId);

    try {
        console.log(`[Sheets] Appending to ${spreadsheetId}...`);
        const sheets = google.sheets({ version: 'v4', auth });

        // Check if header exists
        try {
            const check = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'A1:A1'
            });

            if (!check.data.values || check.data.values.length === 0) {
                console.log("Sheet is empty, adding headers...");
                const headers = [
                    "ID", "Date", "Full Name", "Email", "Phone",
                    "Position", "Religion", "Blood Type", "Address", "CV Link",
                    "DISC Profile", "D Score", "I Score", "S Score", "C Score",
                    "Aptitude Raw Score", "Aptitude (Benar/Total)",
                    "DISC Score (Eval)", "CV Score", "Personal Score",
                    "FINAL Score", "Verdict"
                ];
                await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range: 'A1',
                    valueInputOption: 'RAW',
                    resource: { values: [headers] }
                });
            }
        } catch (error) {
            console.warn("Header check failed, proceeding to append data:", error.message);
        }

        // Prepare row data: 
        // ID, Date, Name, Email, Phone, Position, Religion, Blood, Address, DriveLink,
        // DISC Profile, D, I, S, C, Aptitude Raw, Aptitude Detail,
        // DISC Eval, CV Score, Personal Score, FINAL Score, Verdict
        const aptRaw = candidateData.aptitudeResult;
        const row = [
            candidateData.id.toString(),
            new Date().toISOString().split('T')[0], // YYYY-MM-DD
            candidateData.fullName,
            candidateData.email,
            candidateData.phone,
            candidateData.position || '-',
            candidateData.religion || '-',
            candidateData.bloodType || '-',
            candidateData.address || '-',
            candidateData.cvWebViewLink || `https://drive.google.com/file/d/${candidateData.cvDriveId}`, // Try to construct link
            candidateData.discResult?.profile || '-',
            candidateData.discResult?.dScore || '0',
            candidateData.discResult?.iScore || '0',
            candidateData.discResult?.sScore || '0',
            candidateData.discResult?.cScore || '0',
            // Aptitude Raw Data (real test score)
            aptRaw ? (aptRaw.score || 0).toString() : '-',
            aptRaw ? `${aptRaw.correctCount || 0}/${aptRaw.totalCount || 60}` : '-',
            // AI Evaluation Scores
            (analysisData?.details?.discScore || 0).toString(),
            (analysisData?.details?.cvScore || 0).toString(),
            (analysisData?.details?.personalDataScore || 0).toString(),
            (analysisData?.matchScore || candidateData.analysis?.matchScore || 0) + '%',
            analysisData?.verdict || candidateData.analysis?.verdict || '-'
        ];

        const resource = {
            values: [row],
        };

        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A:V', // 22 columns: A through V
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        return { success: true };

    } catch (error) {
        console.error('Google Sheets Append Error:', error.message);
        if (error.code === 404) {
            console.error("ADVICE: Check if the Spreadsheet ID is correct and the Service Account has 'Editor' access to it.");
        }
        return { success: false, error: error.message };
    }
}

module.exports = { appendToSheet };
