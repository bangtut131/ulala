const axios = require('axios');
const fs = require('fs');

/**
 * Sends a WhatsApp notification using WAHA
 * @param {Object} candidate - Candidate object
 * @param {Object} analysis - Analysis object
 * @param {Object} settings - App settings containing WAHA config
 * @param {Object} aptitudeResult - Aptitude test result object (optional)
 */
async function sendNotification(candidate, analysis, settings, aptitudeResult = null) {
    const { wahaBaseUrl, wahaSessionId, hrPhoneNumber, wahaApiKey } = settings;

    if (!wahaBaseUrl || !hrPhoneNumber) {
        console.log('Skipping WhatsApp notification: Missing configuration.');
        return;
    }

    // Get score details from analysis
    const cvScore = analysis.details?.cvScore || 0;
    const discScore = analysis.details?.discScore || 0;
    const aptitudeScore = analysis.details?.aptitudeScore || 0;
    const personalDataScore = analysis.details?.personalDataScore || 0;

    // Format aptitude result
    let aptitudeInfo = '_Tidak tersedia_';
    if (aptitudeResult) {
        const aptCategory = aptitudeResult.score > 135 ? 'Tinggi' :
            (aptitudeResult.score >= 90 ? 'Rata-rata' : 'Rendah');
        aptitudeInfo = `${aptitudeResult.score} (${aptitudeResult.correctCount}/${aptitudeResult.totalCount} benar) - *${aptCategory}*`;
    }

    const message = `
*📄 Kandidat Baru Dianalisis!*

*Nama:* ${candidate.fullName}
*Posisi:* ${candidate.position}
*No. HP:* ${candidate.phone}

━━━━━━━━━━━━━━━━━━
*📊 HASIL ANALISIS AI*
━━━━━━━━━━━━━━━━━━

*Total Match Score:* ${analysis.matchScore}%
*Keputusan:* ${analysis.verdict}

*Rincian Nilai:*
• CV & Pengalaman: ${cvScore}/100
• Kecocokan DISC: ${discScore}/100
• Kemampuan Kognitif: ${aptitudeScore}/100
• Data Pribadi: ${personalDataScore}/100

━━━━━━━━━━━━━━━━━━
*🧠 HASIL TES APTITUDE*
━━━━━━━━━━━━━━━━━━
• Skor: ${aptitudeInfo}

*Profil DISC:* ${candidate.discResult?.profile || 'N/A'}

_Cek dashboard admin untuk detail lengkap._
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
