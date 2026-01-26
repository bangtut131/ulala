const { db } = require('../server/services/db');

async function debugFinalPayload() {
    console.log("Fetching latest candidate via db service...");
    const candidates = await db.candidate.findMany({ useAdmin: true });
    if (!candidates.length) return;

    // Get latest ID
    const latestId = candidates[0].id;
    console.log(`Analyzing Candidate ID: ${latestId} (${candidates[0].fullName})`);

    // Fetch Details using findUnique (which uses the explicit join logic)
    const detail = await db.candidate.findUnique({
        where: { id: latestId },
        useAdmin: true
    });

    console.log("\n--- APTITUDE RESULT ---");
    if (detail.aptitudeResult) {
        console.log("Present:", detail.aptitudeResult);
    } else {
        console.log("MISSING (value is null)");
    }

    console.log("\n--- ANALYSIS RESULT ---");
    if (detail.analysis) {
        console.log("Present. Scores:");
        console.log("CV:", detail.analysis.cvScore);
        console.log("DISC:", detail.analysis.discScore);
        console.log("Aptitude:", detail.analysis.aptitudeScore);
        console.log("Personal:", detail.analysis.personalDataScore);
        console.log("Verdict:", detail.analysis.verdict);
    } else {
        console.log("MISSING (value is null)");
    }
}

debugFinalPayload();
