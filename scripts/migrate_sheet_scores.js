/**
 * MIGRATION SCRIPT v2 — Backfill Scores + Format Spreadsheet
 * ============================================================
 * 1. Backfills Aptitude RAW score, correct/total, DISC eval, CV score, Personal score
 * 2. Applies professional formatting: freeze header, colors, borders, conditional verdict
 * 
 * USAGE:
 *   node scripts/migrate_sheet_scores.js          # Dry run (preview only)
 *   node scripts/migrate_sheet_scores.js --apply  # Actually apply changes
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { google } = require('googleapis');
const { supabaseAdmin } = require('../server/services/supabaseClient');
const { getSettings } = require('../server/services/settings');

const DRY_RUN = !process.argv.includes('--apply');

// New header layout (22 columns, A-V)
const NEW_HEADERS = [
    "ID", "Date", "Full Name", "Email", "Phone",
    "Position", "Religion", "Blood Type", "Address", "CV Link",
    "DISC Profile", "D Score", "I Score", "S Score", "C Score",
    "Aptitude Raw Score", "Aptitude (Benar/Total)",
    "DISC Score (Eval)", "CV Score", "Personal Score",
    "FINAL Score", "Verdict"
];

async function main() {
    console.log('='.repeat(60));
    console.log(DRY_RUN
        ? '🔍 DRY RUN MODE — No changes will be written'
        : '⚡ APPLY MODE — Changes WILL be written');
    console.log('='.repeat(60));

    // 1. Setup auth
    const settings = await getSettings();

    if (!settings.googleClientId || !settings.googleClientSecret || !settings.googleRefreshToken) {
        console.error('❌ Google OAuth credentials not configured.'); process.exit(1);
    }
    if (!settings.googleSheetId) {
        console.error('❌ Google Sheet ID not configured.'); process.exit(1);
    }

    const oAuth2Client = new google.auth.OAuth2(
        settings.googleClientId, settings.googleClientSecret,
        'http://localhost:3000/api/auth/google/callback'
    );
    oAuth2Client.setCredentials({ refresh_token: settings.googleRefreshToken });
    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    let spreadsheetId = settings.googleSheetId;
    if (spreadsheetId.includes('/spreadsheets/d/'))
        spreadsheetId = spreadsheetId.split('/spreadsheets/d/')[1].split('/')[0];

    console.log(`\n📊 Spreadsheet ID: ${spreadsheetId}`);

    // 2. Read existing data
    console.log('\n📖 Reading current spreadsheet data...');
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1' });
    const rows = response.data.values || [];
    console.log(`   Found ${rows.length} rows (including header)`);

    if (rows.length < 2) { console.log('⚠️ No data rows.'); process.exit(0); }

    // 3. Fetch analyses + aptitude results + candidates from DB
    console.log('\n🔍 Fetching data from database...');

    const { data: analyses, error: aErr } = await supabaseAdmin
        .from('analyses')
        .select('candidate_id, cv_score, disc_score, aptitude_score, personal_data_score, match_score, verdict');
    if (aErr) { console.error('❌ Analyses fetch failed:', aErr.message); process.exit(1); }

    const { data: aptitudes, error: aptErr } = await supabaseAdmin
        .from('aptitude_results')
        .select('candidate_id, score, correct_count, total_count');
    if (aptErr) { console.error('❌ Aptitude fetch failed:', aptErr.message); process.exit(1); }

    const { data: candidates, error: cErr } = await supabaseAdmin
        .from('candidates')
        .select('id, full_name, position, cv_url, cv_drive_id');
    if (cErr) { console.error('❌ Candidates fetch failed:', cErr.message); process.exit(1); }

    // Build lookup maps
    const analysisMap = {};
    analyses.forEach(a => { analysisMap[a.candidate_id] = a; });

    const aptitudeMap = {};
    aptitudes.forEach(a => { aptitudeMap[a.candidate_id] = a; });

    const candidateMap = {};
    candidates.forEach(c => { candidateMap[c.id] = c; });

    console.log(`   Analyses: ${analyses.length} records (${Object.keys(analysisMap).length} unique candidates)`);
    console.log(`   Aptitude: ${aptitudes.length} records (${Object.keys(aptitudeMap).length} unique candidates)`);
    console.log(`   Candidates: ${candidates.length} records`);

    // 4. Fetch Google Drive folders (batch — single API call)
    console.log('\n📂 Fetching Google Drive folders...');
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const folderMap = {}; // folder name → folder ID

    try {
        // Get root folder ID from settings
        let rootFolderId = settings.googleDriveId || '';
        if (rootFolderId.includes('/folders/')) rootFolderId = rootFolderId.split('/folders/')[1].split('?')[0];

        if (rootFolderId) {
            // List all subfolders in root folder
            let pageToken = null;
            do {
                const res = await drive.files.list({
                    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'nextPageToken, files(id, name)',
                    pageSize: 200,
                    pageToken: pageToken
                });
                (res.data.files || []).forEach(f => { folderMap[f.name] = f.id; });
                pageToken = res.data.nextPageToken;
            } while (pageToken);

            console.log(`   Found ${Object.keys(folderMap).length} candidate folders in Drive`);
        } else {
            console.log('   ⚠️ No root Drive folder configured, skipping folder lookup');
        }
    } catch (driveErr) {
        console.warn('   ⚠️ Drive folder lookup failed:', driveErr.message);
    }

    // 5. Detect old format
    const oldHeader = rows[0];
    const colCount = oldHeader.length;
    console.log(`\n📋 Current header has ${colCount} columns`);

    // Find which column index has "Match Score" or "FINAL Score" to detect format
    const matchScoreIdx = oldHeader.findIndex(h => h === 'Match Score' || h === 'FINAL Score');
    const verdictIdx = oldHeader.findIndex(h => h === 'Verdict');

    // 6. Build updated rows
    const updatedRows = [NEW_HEADERS];
    let updatedCount = 0;
    let linkFixedCount = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const candidateId = parseInt(row[0]);

        if (isNaN(candidateId)) {
            updatedRows.push(row);
            continue;
        }

        const analysis = analysisMap[candidateId];
        const aptitude = aptitudeMap[candidateId];
        const candidate = candidateMap[candidateId];

        // Base data: columns A-O (ID through C Score) — always first 15 columns
        const baseData = row.slice(0, 15);
        // Ensure exactly 15 base columns
        while (baseData.length < 15) baseData.push('');

        // Fix CV Link (column J, index 9)
        if (candidate) {
            const folderName = `${candidate.full_name} - ${candidate.position || 'Applicant'}`;
            const folderId = folderMap[folderName];

            if (folderId) {
                baseData[9] = `https://drive.google.com/drive/folders/${folderId}`;
                linkFixedCount++;
            } else if (candidate.cv_drive_id && !candidate.cv_drive_id.startsWith('mock_')) {
                baseData[9] = `https://drive.google.com/file/d/${candidate.cv_drive_id}/view`;
            } else if (candidate.cv_url) {
                baseData[9] = candidate.cv_url;
            } else {
                baseData[9] = '-';
            }
        }

        // Old match score and verdict (find them regardless of old format)
        let oldFinalScore = '';
        let oldVerdict = '';
        if (matchScoreIdx >= 0) oldFinalScore = row[matchScoreIdx] || '';
        if (verdictIdx >= 0) oldVerdict = row[verdictIdx] || '';

        // Build new columns
        const aptRawScore = aptitude ? (aptitude.score || 0).toString() : '-';
        const aptDetail = aptitude ? `${aptitude.correct_count || 0}/${aptitude.total_count || 60}` : '-';
        const discEval = analysis ? (analysis.disc_score || 0).toString() : '0';
        const cvScore = analysis ? (analysis.cv_score || 0).toString() : '0';
        const persScore = analysis ? (analysis.personal_data_score || 0).toString() : '0';
        const finalScore = analysis ? (analysis.match_score || 0) + '%' : oldFinalScore;
        const verdict = analysis ? (analysis.verdict || oldVerdict || '-') : (oldVerdict || '-');

        const newRow = [
            ...baseData,
            aptRawScore, aptDetail,
            discEval, cvScore, persScore,
            finalScore, verdict
        ];

        console.log(`   ✏️ Row ${i + 1} (ID: ${candidateId}): Apt=${aptRawScore} (${aptDetail}), Link=${baseData[9].includes('folders/') ? '📂 Folder' : baseData[9].includes('file/') ? '📄 File' : '⚠️ Other'}`);
        updatedRows.push(newRow);
        updatedCount++;
    }

    console.log(`\n📊 Summary: ${updatedCount} rows processed, ${linkFixedCount} CV links fixed to folder links`);

    // 6. Write + Format
    if (DRY_RUN) {
        console.log('\n🔍 DRY RUN — Preview of first 3 data rows:');
        updatedRows.slice(0, 4).forEach((row, i) => {
            console.log(`   Row ${i}: [${row.join(' | ')}]`);
        });
        console.log('\n💡 To apply: node scripts/migrate_sheet_scores.js --apply');
    } else {
        console.log('\n⚡ Writing data...');

        // Clear + write
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Sheet1' });
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: updatedRows }
        });
        console.log('✅ Data written successfully!');

        // 7. Apply formatting
        console.log('\n🎨 Applying formatting...');
        await applyFormatting(sheets, spreadsheetId, updatedRows.length, NEW_HEADERS.length);
        console.log('✅ Formatting applied!');
    }

    console.log('\n🎉 Migration complete!');
}

async function applyFormatting(sheets, spreadsheetId, totalRows, totalCols) {
    // Get sheet metadata including existing banded ranges and conditional formats
    const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties,sheets.bandedRanges,sheets.conditionalFormats'
    });
    const sheet = meta.data.sheets[0];
    const sheetId = sheet.properties.sheetId;

    const requests = [];

    // Delete existing banded ranges first (to avoid duplicate error)
    if (sheet.bandedRanges && sheet.bandedRanges.length > 0) {
        sheet.bandedRanges.forEach(br => {
            requests.push({ deleteBanding: { bandedRangeId: br.bandedRangeId } });
        });
    }

    // Delete existing conditional format rules
    if (sheet.conditionalFormats && sheet.conditionalFormats.length > 0) {
        // Delete from last to first to avoid index shifting
        for (let i = sheet.conditionalFormats.length - 1; i >= 0; i--) {
            requests.push({ deleteConditionalFormatRule: { sheetId, index: i } });
        }
    }

    // === 1. FREEZE HEADER ROW ===
    requests.push({
        updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
        }
    });

    // === 2. HEADER STYLING (Dark blue bg, white bold text) ===
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
            cell: {
                userEnteredFormat: {
                    backgroundColor: { red: 0.13, green: 0.22, blue: 0.42 }, // Dark navy
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP'
                }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
        }
    });

    // === 3. DATA ROWS — alternating colors ===
    // Light gray for even rows
    if (totalRows > 1) {
        requests.push({
            addBanding: {
                bandedRange: {
                    range: { sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 0, endColumnIndex: totalCols },
                    rowProperties: {
                        firstBandColor: { red: 1, green: 1, blue: 1 },           // White
                        secondBandColor: { red: 0.94, green: 0.96, blue: 0.98 }  // Very light blue-gray
                    }
                }
            }
        });
    }

    // === 4. BORDERS for all data ===
    requests.push({
        updateBorders: {
            range: { sheetId, startRowIndex: 0, endRowIndex: totalRows, startColumnIndex: 0, endColumnIndex: totalCols },
            top: { style: 'SOLID', color: { red: 0.75, green: 0.75, blue: 0.75 } },
            bottom: { style: 'SOLID', color: { red: 0.75, green: 0.75, blue: 0.75 } },
            left: { style: 'SOLID', color: { red: 0.75, green: 0.75, blue: 0.75 } },
            right: { style: 'SOLID', color: { red: 0.75, green: 0.75, blue: 0.75 } },
            innerHorizontal: { style: 'SOLID', color: { red: 0.85, green: 0.85, blue: 0.85 } },
            innerVertical: { style: 'SOLID', color: { red: 0.85, green: 0.85, blue: 0.85 } }
        }
    });

    // === 5. SCORE COLUMNS HIGHLIGHT (P-T: columns 15-19) — light yellow bg ===
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 15, endColumnIndex: 20 },
            cell: {
                userEnteredFormat: {
                    backgroundColor: { red: 1, green: 0.98, blue: 0.90 }, // Light cream/yellow
                    horizontalAlignment: 'CENTER'
                }
            },
            fields: 'userEnteredFormat(backgroundColor,horizontalAlignment)'
        }
    });

    // === 6. FINAL SCORE column (U, index 20) — light green bg ===
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 20, endColumnIndex: 21 },
            cell: {
                userEnteredFormat: {
                    backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 }, // Light green
                    horizontalAlignment: 'CENTER',
                    textFormat: { bold: true }
                }
            },
            fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)'
        }
    });

    // === 7. CONDITIONAL FORMATTING for Verdict column (V, index 21) ===
    // Green — Sangat Direkomendasikan
    requests.push({
        addConditionalFormatRule: {
            rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 21, endColumnIndex: 22 }],
                booleanRule: {
                    condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: 'Sangat Direkomendasikan' }] },
                    format: {
                        backgroundColor: { red: 0.26, green: 0.62, blue: 0.28 },
                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                    }
                }
            },
            index: 0
        }
    });
    // Light green — Direkomendasikan
    requests.push({
        addConditionalFormatRule: {
            rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 21, endColumnIndex: 22 }],
                booleanRule: {
                    condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Direkomendasikan' }] },
                    format: {
                        backgroundColor: { red: 0.56, green: 0.76, blue: 0.49 },
                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                    }
                }
            },
            index: 1
        }
    });
    // Yellow — Bisa Dipertimbangkan
    requests.push({
        addConditionalFormatRule: {
            rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 21, endColumnIndex: 22 }],
                booleanRule: {
                    condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: 'Dipertimbangkan' }] },
                    format: {
                        backgroundColor: { red: 1, green: 0.76, blue: 0.03 },
                        textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, bold: true }
                    }
                }
            },
            index: 2
        }
    });
    // Red — Tidak Direkomendasikan
    requests.push({
        addConditionalFormatRule: {
            rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 21, endColumnIndex: 22 }],
                booleanRule: {
                    condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: 'Tidak Direkomendasikan' }] },
                    format: {
                        backgroundColor: { red: 0.90, green: 0.22, blue: 0.21 },
                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                    }
                }
            },
            index: 3
        }
    });

    // === 8. CENTER-ALIGN score/numeric columns (K-V, indices 10-21) ===
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: totalRows, startColumnIndex: 10, endColumnIndex: 15 },
            cell: {
                userEnteredFormat: { horizontalAlignment: 'CENTER' }
            },
            fields: 'userEnteredFormat.horizontalAlignment'
        }
    });

    // === 9. AUTO-RESIZE columns ===
    requests.push({
        autoResizeDimensions: {
            dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: totalCols }
        }
    });

    // === 10. Set minimum width for narrow columns ===
    // ID column (A) — 50px
    requests.push({
        updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 50 },
            fields: 'pixelSize'
        }
    });

    // Header row height — 40px
    requests.push({
        updateDimensionProperties: {
            range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 40 },
            fields: 'pixelSize'
        }
    });

    // Execute all formatting
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
    });
}

main().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
