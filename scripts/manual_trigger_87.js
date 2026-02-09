const { runAnalysis } = require('../server/services/analysisWorker');
const { db } = require('../server/services/db');

async function trigger() {
    console.log("Manually triggering analysis for ID 87...");

    // We need the aptitude result ID
    const apt = await db.aptitudeResult.findMany({ where: { candidateId: 87 } });
    if (!apt || apt.length === 0) {
        console.error("No aptitude result found for 87");
        return;
    }

    const aptitudeResultId = apt[0].id;
    console.log("Found Aptitude Result ID:", aptitudeResultId);

    try {
        await runAnalysis(87, aptitudeResultId);
        console.log("Manual Trigger Completed.");
    } catch (e) {
        console.error("Manual Trigger Failed:", e);
    }
}

trigger();
