const { db } = require('../server/services/db');
// We need to simulate the Route logic, because the Route contains the "Trigger" logic.
// However, calling Route functions is hard.
// Instead, let's replicate the Route logic EXACTLY here to see if it fails.

const { analyzeCandidate } = require('../server/services/aiAnalysis');
const { appendToSheet } = require('../server/services/googleSheets');
// Mock other services if needed, but we want to test AI mainly.

async function testFullFlow() {
    console.log("=== STARTING FULL FLOW TEST ===");
    const timestamp = Date.now();
    const email = `test_debug_${timestamp}@example.com`;

    // 1. Create Candidate
    console.log("1. Creating Candidate...");
    let candidate;
    try {
        candidate = await db.candidate.create({
            data: {
                fullName: `Test Debugger ${timestamp}`,
                email: email,
                phone: "08123456789",
                position: "Debugger",
                cvText: "This is a mock CV text for debugging purposes. Experienced in Node.js and SQL."
            }
        });
        console.log(`   > Success. ID: ${candidate.id}`);
    } catch (e) {
        console.error("   > FAILED:", e);
        return;
    }

    // 2. Submit DISC
    console.log("2. Submitting DISC...");
    try {
        await db.discResult.create({
            data: {
                candidateId: candidate.id,
                dScore: 50, iScore: 50, sScore: 50, cScore: 50,
                profile: "S",
                answers: "[]",
                fullResult: { pattern: "Classic" }
            }
        });
        console.log("   > Success.");
    } catch (e) {
        console.error("   > FAILED:", e);
    }

    // 3. Submit Aptitude (Logic from server/routes/candidate.js:267)
    console.log("3. Submitting Aptitude & Triggering AI...");
    try {
        // A. Save Aptitude
        const aptitudeResult = await db.aptitudeResult.create({
            data: {
                candidateId: candidate.id,
                score: 110,
                correctCount: 22,
                totalCount: 40,
                answers: "{}"
            }
        });
        console.log("   > Aptitude Saved.");

        // B. Trigger AI (The critical part)
        // Re-fetch candidate to get relations
        const fullCandidate = await db.candidate.findUnique({ where: { id: candidate.id } });

        console.log("   > Fetched Full Candidate for Analysis.");
        console.log("     - DISC present?", !!fullCandidate.discResult);
        console.log("     - Aptitude present?", !!fullCandidate.aptitudeResult);

        console.log("   > Calling analyzeCandidate()...");
        const analysis = await analyzeCandidate(fullCandidate, fullCandidate.cvText, fullCandidate.discResult, aptitudeResult);

        console.log("   > AI Analysis Returned:");
        console.log(JSON.stringify(analysis, null, 2));

        if (!analysis.matchScore) console.error("   !!! MATCH SCORE MISSING !!!");

        // C. Save Analysis (Logic from Route)
        console.log("   > Saving Analysis to DB...");

        const payload = {
            candidateId: candidate.id,
            matchScore: analysis.matchScore,
            content: analysis.content,
            verdict: analysis.verdict,
            ocrText: fullCandidate.cvText,
            // NEW FIELDS
            cvScore: analysis.details?.cvScore || 0,
            discScore: analysis.details?.discScore || 0,
            aptitudeScore: analysis.details?.aptitudeScore || 0,
            personalDataScore: analysis.details?.personalDataScore || 0
        };

        const savedAnalysis = await db.analysis.create({ data: payload });
        console.log(`   > Analysis Saved. ID: ${savedAnalysis.id}`);
        console.log("=== TEST COMPLETED SUCCESSFULLY ===");

    } catch (e) {
        console.error("   > PROCESS FAILED:", e);
    }
}

testFullFlow();
