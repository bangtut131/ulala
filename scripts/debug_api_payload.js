const { db } = require('../server/services/db');

async function checkApiResponse() {
    console.log("Simulating API Response (db.findMany)...");
    const candidates = await db.candidate.findMany();

    if (candidates.length === 0) return;
    const latest = candidates[0]; // Ordered by created_at desc

    console.log("Latest Candidate Payload:");
    console.log(JSON.stringify(latest, null, 2));

    if (latest.analysis) {
        console.log("Analysis Section:");
        console.log("CV Score:", latest.analysis.cvScore); // camelCase expected
        console.log("DISC Score:", latest.analysis.discScore);
    } else {
        console.error("No analysis object found in payload");
    }
}

checkApiResponse();
