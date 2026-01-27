const { runAnalysis } = require('../server/services/analysisWorker');

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        const { candidateId, aptitudeResultId } = payload;

        if (!candidateId) {
            console.error("Missing candidateId in background function payload");
            return { statusCode: 400, body: "Missing candidateId" };
        }

        console.log(`[Background] Triggered for Candidate ${candidateId}`);

        // Run the worker
        await runAnalysis(candidateId, aptitudeResultId);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Analysis complete" })
        };
    } catch (error) {
        console.error("[Background] Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
