const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const path = require('path');
const { getSettings } = require('./settings');

// const SETTINGS_PATH = path.join(__dirname, '../settings.json'); // REMOVED: Using centralized settings

// REMOVED: Duplicate getSettings
// function getSettings() {
//   if (fs.existsSync(SETTINGS_PATH)) {
//     return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
//   }
//   return {};
// }

async function analyzeCandidate(candidate, cvText, discResult, aptitudeResult) {
  const settings = await getSettings();
  const apiKey = settings.geminiApiKey;

  if (!apiKey || apiKey === '') {
    console.log('No valid API Key found. Using Mock.');
    return mockAnalyze(candidate, discResult);
  }

  const systemPrompt = settings.systemPrompt || "You are an expert HR assistant. Analyze the candidate based on CV, DISC, and Aptitude Test results.";

  const context = `
        Role Applied For: ${candidate.position || "General Applicant"}
        
        Candidate Personal Data:
        - Name: ${candidate.fullName}
        - Age/DOB: ${candidate.dob || 'Not specified'}
        - Gender: ${candidate.gender || 'Not specified'}
        - Domicile: ${candidate.address || 'Not specified'}
        - Religion: ${candidate.religion || 'Not specified'}
        - Marital Status: ${candidate.maritalStatus || 'Not specified'}
        
        [PSYCHOMETRIC TEST RESULTS]
        
        1. DISC Profile (Personality):
        ${discResult ? `
        - Profile Type: ${discResult.profile} (D:${discResult.dScore}, I:${discResult.iScore}, S:${discResult.sScore}, C:${discResult.cScore})
        ${discResult.fullResult ? `
        - Adapted Pattern (Work): ${discResult.fullResult.profile1?.pattern || '-'}
        - Natural Pattern (Self): ${discResult.fullResult.profile2?.pattern || '-'}
        - Consistency Level: ${discResult.fullResult.consistency?.level || '-'} (${discResult.fullResult.consistency?.description || ''})
        - Job Fit Analysis (Based on DISC): ${discResult.fullResult.jobMatch ? discResult.fullResult.jobMatch.join(', ') : '-'}
        - AI Pattern Conclusion: ${discResult.fullResult.conclusion || '-'}
        ` : ''}` : '- DISC Result Not Available -'}

        2. APTITUDE TEST (Logic & Cognitive):
        ${aptitudeResult ? `
        - Score: ${aptitudeResult.score} (Max Score: 180. Formula: Correct Answers * 3)
        - Correct Answers: ${aptitudeResult.correctCount} / ${aptitudeResult.totalCount}
        - Interpretation Guide:
          * > 135 : High / Superior (More than 45 correct)
          * 90 - 135 : Average / Normal (30 - 45 correct)
          * < 90 : Low / Below Average (Less than 30 correct)
        ` : '- Aptitude Result Not Available -'}
        
        [CV CONTENT (OCR SCAN)]
        ${cvText.substring(0, 4000)}
        `;

  const userPrompt = `
        Please analyze this candidate for the position of "${candidate.position || "Staff"}".
        
        INSTRUCTIONS FOR SCORING:
        Evaluate the candidate on 4 specific dimensions (scale 0-100) based on the data provided:
        
        1. **cvScore** (0-100): Evaluate specific Hard Skills, Relevant Experience, and Education fit for the role.
        2. **discScore** (0-100): Evaluate Personality Fit. Does their DISC profile match the behavioral demands of the job? (e.g. Sales needs high I/D, Admin needs high C/S).
        3. **aptitudeScore** (0-100): Evaluate Cognitive Ability based on the Aptitude Score provided. (Reference: >135 is High, 90-135 is Average, <90 is Low).
        4. **personalDataScore** (0-100): Evaluate Administrative Fit. Consider location (domicile vs office), age appropriateness, and completeness of data.

        Important: Be critical. Do not give high scores if experience is irrelevant or cognitive score is low.

        OUTPUT FORMAT:
        Return a strictly valid JSON object strictly adhering to this structure:
        { 
            "cvScore": number,
            "discScore": number,
            "aptitudeScore": number,
            "personalDataScore": number,
            "content": "Detailed markdown analysis in Indonesian language. Structure it with H3 headings (###) like '### Analisis Profil', '### Analisis Data Pribadi', '### Kecocokan DISC', '### Kemampuan Kognitif', '### Kesimpulan Komprehensif'. \n\nIMPORTANT: Your text conclusion MUST match the scores you give based on this weighted formula:\nFinal Score = (cvScore * 40%) + (discScore * 25%) + (aptitudeScore * 20%) + (personalDataScore * 15%)\n\nVerdict Thresholds:\n> 85 : Sangat Direkomendasikan\n75 - 84 : Direkomendasikan\n50 - 74 : Bisa Dipertimbangkan\n< 50 : Tidak Direkomendasikan\n\nEnsure your 'Kesimpulan Komprehensif' explicitly states one of these verdicts based on your scores.", 
            "ocrText": "" 
        }
        `;

  const prompt = context + userPrompt;

  let aiResponseData = null;

  // Helper to calculate result from raw scores
  const calculateFinalResult = (scores, textAnalysis) => {
    // Weights
    const W_CV = 0.40;
    const W_DISC = 0.25;
    const W_APT = 0.20;
    const W_PERS = 0.15;

    const weightedScore = (
      (scores.cvScore * W_CV) +
      (scores.discScore * W_DISC) +
      (scores.aptitudeScore * W_APT) +
      (scores.personalDataScore * W_PERS)
    );

    const finalScore = Math.round(weightedScore);

    // Strict Verdict Thresholds
    let verdict = "Tidak Direkomendasikan";
    if (finalScore >= 85) verdict = "Sangat Direkomendasikan";
    else if (finalScore >= 75) verdict = "Direkomendasikan";
    else if (finalScore >= 50) verdict = "Bisa Dipertimbangkan";

    return {
      matchScore: finalScore,
      content: textAnalysis,
      verdict: verdict,
      details: scores // Store component scores if needed later
    };
  };


  // --- CUSTOM PROVIDER (OpenAI Compatible) ---
  if (settings.aiProvider === 'custom') {
    try {
      console.log(`[AI] Analyzing candidate using Custom Provider (${settings.aiBaseUrl})...`);

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: settings.aiBaseUrl || "https://api.openai.com/v1",
      });

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        model: settings.aiModel || "gpt-3.5-turbo",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      aiResponseData = JSON.parse(content);

      const result = calculateFinalResult(
        {
          cvScore: aiResponseData.cvScore || 0,
          discScore: aiResponseData.discScore || 0,
          aptitudeScore: aiResponseData.aptitudeScore || 0,
          personalDataScore: aiResponseData.personalDataScore || 0
        },
        aiResponseData.content
      );

      return { ...result, ocrText: cvText };

    } catch (error) {
      console.error("Custom AI Error:", error.message);
      return mockAnalyze(candidate, discResult);
    }
  }

  // --- GOOGLE GEMINI (Default) ---
  try {
    console.log(`[AI] Analyzing candidate using Gemini...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const finalPrompt = systemPrompt + "\n" + prompt;
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    aiResponseData = JSON.parse(jsonStr);

    const calcResult = calculateFinalResult(
      {
        cvScore: aiResponseData.cvScore || 0,
        discScore: aiResponseData.discScore || 0,
        aptitudeScore: aiResponseData.aptitudeScore || 0,
        personalDataScore: aiResponseData.personalDataScore || 0
      },
      aiResponseData.content
    );

    return { ...calcResult, ocrText: cvText };

  } catch (error) {
    console.error("Gemini API Error:", error.message);
    return mockAnalyze(candidate, discResult);
  }
}

function mockAnalyze(candidate, discResult) {
  console.log(`[Mock] AI Analyze fallback for ${candidate.fullName}`);
  const mockOCRText = `[MOCK OCR] Name: ${candidate.fullName}...`;
  const mockContent = `### Analysis (Mock)\nCandidate ${candidate.fullName} matches well based on mock logic.`;

  const scores = {
    cvScore: 80,
    discScore: 85,
    aptitudeScore: 90,
    personalDataScore: 85
  };

  return {
    matchScore: 84, // Calculated roughly from above
    content: mockContent,
    ocrText: mockOCRText,
    verdict: "Direkomendasikan",
    details: scores
  };
}

module.exports = { analyzeCandidate };
