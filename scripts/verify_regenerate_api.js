// verify_regenerate_api.js
const fetch = require('node-fetch');

async function testRegenerate() {
    const candidateId = 92; // Use known ID
    console.log(`Testing regenerate for Candidate ${candidateId}...`);

    try {
        const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}/analysis/trigger`, {
            method: 'POST'
        });

        const data = await response.json();
        console.log("Response:", data);

        if (response.ok && data.success) {
            console.log("API Verification PASSED.");
        } else {
            console.error("API Verification FAILED:", data);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testRegenerate();
