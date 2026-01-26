
const { db } = require('../server/services/db');

async function checkData() {
    try {
        console.log("Fetching manpower requests...");
        const requests = await db.manpowerRequest.findMany();

        if (requests.length === 0) {
            console.log("No manpower requests found.");
        } else {
            console.log(`Found ${requests.length} requests.`);
            const sample = requests[0];
            console.log("Sample Request Keys:", Object.keys(sample));
            console.log("Sample Request Data:", JSON.stringify(sample, null, 2));

            if (sample.hasOwnProperty('approvedAt')) {
                console.log("✅ 'approvedAt' field is present.");
            } else {
                console.log("❌ 'approvedAt' field is MISSING.");
            }

            if (sample.hasOwnProperty('finalizedAt')) {
                console.log("✅ 'finalizedAt' field is present.");
            } else {
                console.log("❌ 'finalizedAt' field is MISSING.");
            }
        }
    } catch (error) {
        console.error("FULL ERROR OBJECT:", error);
        console.error("ERROR MESSAGE:", error.message);
        if (error.hint) console.error("HINT:", error.hint);
    }
}

checkData();
