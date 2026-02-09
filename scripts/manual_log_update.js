require('dotenv').config({ path: './server/.env' });
const { db } = require('../server/services/db');

async function testUpdate() {
    console.log("Attempting to update ID 84 otherInfo...");
    try {
        const result = await db.candidate.update({
            where: { id: 84 },
            data: { otherInfo: "[Debug] Manually injected log via script." }
        });
        console.log("Update Result:", result.otherInfo);
    } catch (e) {
        console.error("Update Failed:", e);
    }
}

testUpdate();
