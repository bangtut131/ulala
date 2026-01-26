require('dotenv').config({ path: './server/.env' });
const { db } = require('./server/services/db');

async function testCreateVacancy() {
    console.log("Testing Vacancy Creation...");
    const payload = {
        manpowerRequestId: 15, // Use the ID we found exists
        title: "Test Vacancy Debug",
        description: "Debug description",
        requirements: "Debug requirements",
        expiresAt: null,
        isActive: true
    };

    try {
        const result = await db.jobVacancy.create({ data: payload });
        console.log("Vacancy Created Successfully:", result);
    } catch (error) {
        console.error("Error creating vacancy:", error); // Inspect this!
        if (error.code) console.error("Error Code:", error.code);
        if (error.details) console.error("Error Details:", error.details);
        if (error.hint) console.error("Error Hint:", error.hint);
    }
}

testCreateVacancy();
