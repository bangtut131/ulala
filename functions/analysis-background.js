const { runAnalysis } = require('../server/services/analysisWorker');

// Netlify Background Function
// Must end in -background.js to be treated as a background task (up to 15m execution)
exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        const { candidateId, aptitudeResultId } = payload;

        console.log(`[Background] Triggered for Candidate ${candidateId}`);

        if (!candidateId) {
            return { statusCode: 400, body: "Missing candidateId" };
        }

        // Run the heavy worker
        // Note: In background functions, we can await this. 
        // Netlify will keep the process alive until this completes (or 15 mins timeout).
        await runAnalysis(candidateId, aptitudeResultId);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Background Analysis Complete" })
        };
    } catch (error) {
        console.error("[Background] Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
