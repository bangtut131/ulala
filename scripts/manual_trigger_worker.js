require('dotenv').config({ path: './server/.env' });
const { runAnalysis } = require('../server/services/analysisWorker');
const { db } = require('../server/services/db');
const fs = require('fs');

async function trigger() {
    console.log("Fetching latest candidate ID...");
    const candidateId = 84; // Targeting ID 84 (Latest Phone submission)

    if (!candidateId) {
        console.error("No candidate ID found in latest_candidate.json");
        return;
    }

    console.log(`Triggering Worker for Candidate ID: ${candidateId}`);

    try {
        const result = await runAnalysis(candidateId);
        console.log("Worker Result:", result);
    } catch (e) {
        console.error("Worker Execution Failed:", e);
    }
}

trigger();
