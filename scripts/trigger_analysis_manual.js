const { db } = require('../server/services/db');
const { analyzeCandidate } = require('../server/services/aiAnalysis');
const { prisma } = require('../server/services/db'); // db is the wrapper, we might need direct access if wrapper limits us, but let's use wrapper logic

async function runManualAnalysis() {
    console.log("Fetching latest candidate...");
    const candidates = await db.candidate.findMany();
    if (candidates.length === 0) return;
    const candidate = candidates[0]; // Latest
    console.log(`Analyzing Candidate: ${candidate.fullName} (ID: ${candidate.id})`);

    // Verify requirements
    // Fetch fresh to get relationships if findMany didn't fully populate (findMany in db.js populates them though)
    const fullCandidate = await db.candidate.findUnique({ where: { id: candidate.id } });

    if (!fullCandidate.discResult) {
        console.error("No DISC Result found!");
        // return; 
    }
    // Mock aptitude if missing for test
    const aptitude = fullCandidate.aptitudeResult || { score: 100, correctCount: 10, totalCount: 20 };

    console.log("Running AI Analysis...");
    try {
        const analysis = await analyzeCandidate(fullCandidate, fullCandidate.cvText || "Mock CV Text", fullCandidate.discResult || {}, aptitude);
        console.log("AI Result:", JSON.stringify(analysis, null, 2));

        if (analysis.matchScore === undefined) {
            console.error("Result missing matchScore!");
        }

        console.log("Attempting DB Insert...");

        // Mocking the insert call to see if DB fails
        const payload = {
            candidateId: fullCandidate.id,
            matchScore: analysis.matchScore,
            content: analysis.content,
            verdict: analysis.verdict,
            ocrText: analysis.ocrText,
            // Detailed
            cvScore: analysis.details?.cvScore || 0,
            discScore: analysis.details?.discScore || 0,
            aptitudeScore: analysis.details?.aptitudeScore || 0,
            personalDataScore: analysis.details?.personalDataScore || 0
        };
        console.log("Payload:", payload);

        const saved = await db.analysis.create({ data: payload });
        console.log("Saved Analysis ID:", saved.id);

    } catch (error) {
        console.error("Manual Analysis Failed:", error);
    }
}

runManualAnalysis();
