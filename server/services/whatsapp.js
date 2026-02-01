const axios = require('axios');
const fs = require('fs');

/**
 * Sends a WhatsApp notification using WAHA
 * @param {Object} candidate - Candidate object
 * @param {Object} analysis - Analysis object
 * @param {Object} settings - App settings containing WAHA config
 */
async function sendNotification(candidate, analysis, settings) {
    const { wahaBaseUrl, wahaSessionId, hrPhoneNumber, wahaApiKey } = settings;

    if (!wahaBaseUrl || !hrPhoneNumber) {
        console.log('Skipping WhatsApp notification: Missing configuration.');
        return;
    }

    const message = `
*New Candidate Analyzed!* 📄

*Name:* ${candidate.fullName}
*Position:* ${candidate.position}
*Phone:* ${candidate.phone}

*AI Match Score:* ${analysis.matchScore}%
*Verdict:* ${analysis.verdict}
*DISC Profile:* ${candidate.discResult?.profile || 'N/A'}

_Please check the admin dashboard for full details._
    `.trim();

    try {
        // Check if it's a Group ID (contains @) or a Phone Number
        const chatId = hrPhoneNumber.includes('@')
            ? hrPhoneNumber
            : `${hrPhoneNumber.replace('+', '')}@c.us`;

        console.log(`Sending WhatsApp notification to ${chatId}...`);

        const headers = { 'Content-Type': 'application/json' };
        if (wahaApiKey) {
            headers['X-Api-Key'] = wahaApiKey;
        }

        await axios.post(`${wahaBaseUrl}/api/sendText`, {
            chatId: chatId,
            text: message,
            session: wahaSessionId || 'default'
        }, { headers });

        console.log('WhatsApp notification sent successfully.');

    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error.message);
        if (error.response) {
            console.error('WAHA Response:', error.response.data);
        }
    }
}

module.exports = { sendNotification };
