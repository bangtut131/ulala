const { db } = require('../server/services/db');

async function debugLatest() {
    console.log("Fetching latest candidate...");
    const candidates = await db.candidate.findMany();
    if (candidates.length === 0) {
        console.log("No candidates found.");
        return;
    }

    // Get the most recent one (candidates are ordered by createdAt desc in db.js)
    const latest = candidates[0];
    console.log(`Latest Candidate: ${latest.fullName} (ID: ${latest.id})`);
    console.log("--- DISC Result ---");
    console.log(latest.discResult ? "Present" : "MISSING");
    if (latest.discResult) console.log(latest.discResult);

    console.log("--- Aptitude Result ---");
    console.log(latest.aptitudeResult ? "Present" : "MISSING");
    if (latest.aptitudeResult) console.log(latest.aptitudeResult);

    console.log("--- Analysis ---");
    console.log(latest.analysis ? "Present" : "MISSING");
    if (latest.analysis) console.log(latest.analysis);
}

debugLatest();
