const { runAnalysis } = require('../server/services/analysisWorker');
const { db } = require('../server/services/db');

async function trigger() {
    console.log("Manually triggering analysis for ID 92...");

    const candidateId = 92;
    // Aptitude result for 92 is ID 78 based on inspection
    const aptitudeResultId = 78;

    try {
        await runAnalysis(candidateId, aptitudeResultId);
        console.log("Manual Trigger Completed for 92.");
    } catch (e) {
        console.error("Manual Trigger Failed:", e);
    }
}

trigger();
