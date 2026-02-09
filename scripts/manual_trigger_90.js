const { runAnalysis } = require('../server/services/analysisWorker');
const { db } = require('../server/services/db');

async function trigger() {
    console.log("Manually triggering analysis for ID 90...");

    // Aptitude result for 90 is ID 76 based on inspection
    const candidateId = 90;
    const aptitudeResultId = 76;

    try {
        await runAnalysis(candidateId, aptitudeResultId);
        console.log("Manual Trigger Completed for 90.");
    } catch (e) {
        console.error("Manual Trigger Failed:", e);
    }
}

trigger();
