const { db } = require('../server/services/db');

async function testUpdate() {
    try {
        console.log("Testing db.candidate.update with Admin privs...");

        // 1. Fetch the latest candidate (ID 87)
        const candidates = await db.candidate.findMany({ useAdmin: true });
        if (candidates.length === 0) {
            console.log("No candidates found.");
            return;
        }
        const targetId = candidates[0].id; // Should be 87
        console.log(`Targeting Candidate ID: ${targetId}`);

        // 2. Attempt explicit update of otherInfo
        const updateResult = await db.candidate.update({
            where: { id: targetId },
            data: { otherInfo: "[Debug] Test Log Update from Script" }
        });

        console.log("Update Result:", updateResult);

        // 3. Verify read back
        const verified = await db.candidate.findUnique({ where: { id: targetId }, useAdmin: true });
        console.log("Verified otherInfo:", verified.otherInfo);

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testUpdate();
