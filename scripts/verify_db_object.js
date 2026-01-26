const { db } = require('../server/services/db');

async function verifyDbObject() {
    console.log("Checking DB Object keys...");
    const keys = Object.keys(db);
    console.log("Keys found:", keys);

    if (keys.includes('manpowerRequest') && keys.includes('portalUser')) {
        console.log("SUCCESS: Recovered missing services.");
    } else {
        console.error("FAIL: Still missing services.");
    }
}

verifyDbObject();
