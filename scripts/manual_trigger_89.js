const { runAnalysis } = require('../server/services/analysisWorker');
const { db } = require('../server/services/db');

async function trigger() {
    console.log("Manually triggering analysis for ID 89...");

    // We need the aptitude result ID of ID 89
    // Based on inspection, Aptitude Result ID for 89 is 75
    const candidateId = 89;
    const aptitudeResultId = 75;

    try {
        await runAnalysis(candidateId, aptitudeResultId);
        console.log("Manual Trigger Completed for 89.");
    } catch (e) {
        console.error("Manual Trigger Failed:", e);
    }
}

trigger();
