const { db } = require('../server/services/db');

async function verifyAdminFetch() {
    console.log("Verifying Admin Fetch...");

    // 1. Get a candidate ID that we know exists (from previous steps)
    // We can use findMany to grab one.
    const candidates = await db.candidate.findMany();
    if (candidates.length === 0) { console.log("No candidates."); return; }

    const targetId = candidates[0].id;
    console.log(`Testing with Candidate ID: ${targetId}`);

    // 2. Fetch WITHOUT admin (Standard)
    console.log("--- Standard Fetch ---");
    const std = await db.candidate.findUnique({ where: { id: targetId }, useAdmin: false });
    console.log("DISC present?", !!std.discResult);
    console.log("Aptitude present?", !!std.aptitudeResult);

    // 3. Fetch WITH admin (Privileged)
    console.log("--- Admin Fetch ---");
    const admin = await db.candidate.findUnique({ where: { id: targetId }, useAdmin: true });
    console.log("DISC present?", !!admin.discResult);
    console.log("Aptitude present?", !!admin.aptitudeResult);

    if (admin.discResult && admin.aptitudeResult) {
        console.log("SUCCESS: Admin fetch retrieved all data.");
    } else {
        console.warn("WARNING: Admin fetch still missing data. Check DB content.");
    }
}

verifyAdminFetch();
