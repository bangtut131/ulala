const http = require('http');
const { db } = require('../server/services/db');

async function verifyApiResponse() {
    console.log("1. Finding latest candidate ID...");
    const candidates = await db.candidate.findMany({ useAdmin: true });

    if (candidates.length === 0) {
        console.log("No candidates found.");
        return;
    }
    const latest = candidates[0];
    const id = latest.id;
    console.log(`Target Candidate ID: ${id}`);

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/candidates/${id}`,
        method: 'GET'
    };

    console.log(`2. Making GET request to http://localhost:3000/api/candidates/${id}...`);

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`3. Response Status: ${res.statusCode}`);
            try {
                const json = JSON.parse(data);
                console.log("--- API RESPONSE BODY ---");
                console.log(JSON.stringify(json, null, 2));

                if (json.analysis) {
                    console.log("\n--- ANALYSIS OBJECT ---");
                    console.log("CV Score:", json.analysis.cvScore);
                    console.log("DISC Score:", json.analysis.discScore);
                    console.log("Aptitude Score:", json.analysis.aptitudeScore);
                    console.log("Personal Data Score:", json.analysis.personalDataScore);
                } else {
                    console.error("\n!!! ANALYSIS OBJECT MISSING IN API RESPONSE !!!");
                }

            } catch (e) {
                console.error("Failed to parse JSON:", e);
                console.log("Raw Body:", data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Request failed: ${e.message}`);
    });

    req.end();
}

verifyApiResponse();
