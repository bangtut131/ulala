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

  // Determine data availability flags
  const hasDisc = discResult && discResult.profile;
  const hasAptitude = aptitudeResult && aptitudeResult.score !== undefined && aptitudeResult.score !== null;

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
        ${hasDisc ? `
        - Profile Type: ${discResult.profile} (D:${discResult.dScore}, I:${discResult.iScore}, S:${discResult.sScore}, C:${discResult.cScore})
        ${discResult.fullResult ? `
        - Adapted Pattern (Work): ${discResult.fullResult.profile1?.pattern || '-'}
        - Natural Pattern (Self): ${discResult.fullResult.profile2?.pattern || '-'}
        - Consistency Level: ${discResult.fullResult.consistency?.level || '-'} (${discResult.fullResult.consistency?.description || ''})
        - Job Fit Analysis (Based on DISC): ${discResult.fullResult.jobMatch ? discResult.fullResult.jobMatch.join(', ') : '-'}
        - AI Pattern Conclusion: ${discResult.fullResult.conclusion || '-'}
        ` : ''}` : '- DISC TEST: BELUM DIKERJAKAN / DATA TIDAK TERSEDIA -'}

        2. APTITUDE TEST (Logic & Cognitive):
        ${hasAptitude ? `
        - Score: ${aptitudeResult.score} (Max Score: 180. Formula: Correct Answers * 3)
        - Correct Answers: ${aptitudeResult.correctCount} / ${aptitudeResult.totalCount}
        - Interpretation Guide:
          * > 135 : High / Superior (More than 45 correct)
          * 90 - 135 : Average / Normal (30 - 45 correct)
          * < 90 : Low / Below Average (Less than 30 correct)
        ` : '- APTITUDE TEST: BELUM DIKERJAKAN / DATA TIDAK TERSEDIA -'}
        
        [CV CONTENT (OCR SCAN)]
        ${cvText.substring(0, 4000)}
        `;

  const userPrompt = `
        Analyze this candidate for the position of "${candidate.position || "Staff"}".
        
        =============================================
        REFERENSI STANDAR POSISI (GUNAKAN SEBAGAI ACUAN PENILAIAN)
        =============================================
        
        Berikut standar umum yang berlaku di perusahaan agribisnis/distribusi di Indonesia.
        Cocokkan posisi yang dilamar kandidat dengan kategori terdekat:

        [STAFF ADMIN / ADMINISTRASI]
        - Pendidikan min: SMA/SMK, ideal D3/S1
        - Skill: Ms. Office, ketelitian, filing, data entry
        - DISC Ideal: C tinggi (teliti, akurat) dan S tinggi (konsisten, sabar)
        - Aptitude: Minimal Average (≥90)

        [SALES / MARKETING / ACCOUNT EXECUTIVE]
        - Pendidikan min: SMA/SMK, ideal S1
        - Skill: Komunikasi, negosiasi, target-oriented, pengalaman sales
        - DISC Ideal: I tinggi (persuasif, komunikatif) dan D tinggi (agresif, goal-oriented)
        - Aptitude: Minimal Average (≥90)

        [DRIVER / SUPIR]
        - Pendidikan min: SMA/SMK
        - Skill: SIM A/B aktif, pengalaman mengemudi, kenal rute
        - DISC Ideal: S tinggi (sabar, stabil) dan C tinggi (patuh aturan)
        - Aptitude: Low-Average acceptable (≥75)

        [WAREHOUSE / GUDANG / HELPER]
        - Pendidikan min: SMP/SMA
        - Skill: Fisik kuat, teliti, jujur, bisa kerja shift
        - DISC Ideal: S tinggi (stabil, kooperatif) dan C tinggi (patuh prosedur)
        - Aptitude: Low-Average acceptable (≥75)

        [ACCOUNTING / FINANCE / KEUANGAN]
        - Pendidikan min: D3/S1 Akuntansi/Keuangan
        - Skill: Akuntansi, pajak, laporan keuangan, software accounting
        - DISC Ideal: C tinggi (akurat, analitis) dan S tinggi (konsisten)
        - Aptitude: Minimal High-Average (≥105)

        [SUPERVISOR / KEPALA BAGIAN]
        - Pendidikan min: S1
        - Skill: Leadership, problem solving, pengalaman min 3 tahun di bidang
        - DISC Ideal: D tinggi (tegas, decisive) dan I tinggi (memotivasi tim)
        - Aptitude: Minimal High-Average (≥105)

        [MANAGER / HEAD]
        - Pendidikan min: S1, ideal S2
        - Skill: Strategic thinking, leadership, pengalaman min 5 tahun
        - DISC Ideal: D tinggi (decisif, target-driven) dan I tinggi (inspiring)
        - Aptitude: Minimal Superior (≥120)

        [IT / TEKNISI / ENGINEER]
        - Pendidikan min: SMK/D3/S1 terkait
        - Skill: Technical skills relevan, problem solving, sertifikasi
        - DISC Ideal: C tinggi (analitis, detail) dan D tinggi (problem solver)
        - Aptitude: Minimal High-Average (≥105)

        [HRD / PERSONALIA]
        - Pendidikan min: S1 Psikologi/Hukum/Manajemen
        - Skill: Rekrutmen, UU Ketenagakerjaan, komunikasi interpersonal
        - DISC Ideal: I tinggi (komunikatif) dan S tinggi (empati, sabar)
        - Aptitude: Minimal Average (≥90)

        [CUSTOMER SERVICE / RECEPTIONIST]
        - Pendidikan min: SMA/D3
        - Skill: Komunikasi, penampilan, kesabaran, service-oriented
        - DISC Ideal: I tinggi (ramah, persuasif) dan S tinggi (sabar, tenang)
        - Aptitude: Minimal Average (≥90)

        Jika posisi tidak cocok persis dengan daftar di atas, gunakan kategori terdekat.
        
        =============================================
        INSTRUKSI PENILAIAN (WAJIB DIPATUHI)
        =============================================

        Berikan skor pada 4 dimensi (skala 0-100):

        1. **cvScore** (0-100): Evaluasi Hard Skills, Pengalaman Kerja RELEVAN, dan Pendidikan.
           - Pengalaman TIDAK RELEVAN dengan posisi = skor RENDAH (≤40)
           - Fresh graduate tanpa pengalaman untuk posisi yang butuh pengalaman = skor RENDAH (≤35)
           - Pendidikan tidak sesuai minimum = penalti -20 dari skor dasar
           - Pengalaman relevan + pendidikan sesuai = skor TINGGI (≥70)

        2. **discScore** (0-100): Evaluasi Kecocokan Kepribadian DISC dengan posisi.
           - Bandingkan profil DISC kandidat dengan DISC Ideal di referensi standar posisi
           - Profil cocok = skor ≥70
           - Profil TIDAK cocok (misal: kandidat S/C tinggi melamar Sales yang butuh I/D) = skor RENDAH (≤40)
           - Konsistensi rendah = penalti -10
           ${!hasDisc ? '- DATA TIDAK TERSEDIA: Berikan discScore = 0' : ''}

        3. **aptitudeScore** (0-100): Evaluasi Kemampuan Kognitif.
           - Konversikan skor aptitude ke skala 0-100 berdasarkan: skor aptitude / 180 * 100
           - Jika skor aptitude di bawah minimum standar posisi = penalti -15
           ${!hasAptitude ? '- DATA TIDAK TERSEDIA: Berikan aptitudeScore = 0' : ''}

        4. **personalDataScore** (0-100): Evaluasi kelengkapan data, lokasi domisili, usia, dan kesesuaian administratif.
           - Data lengkap dan sesuai = ≥70
           - Domisili sangat jauh dari kantor tanpa kesediaan relokasi = penalti -15
           - Data tidak lengkap = skor ≤50

        ATURAN STRICT:
        - Jadilah KRITIS dan OBJEKTIF. Ini digunakan untuk keputusan hire NYATA.
        - JANGAN memberikan skor tinggi hanya karena "bisa dipelajari" atau "berpotensi".
        - Evaluasi berdasarkan DATA YANG ADA, bukan asumsi.
        - ${!hasDisc ? 'discScore HARUS = 0 karena data DISC tidak tersedia.' : ''}
        - ${!hasAptitude ? 'aptitudeScore HARUS = 0 karena data Aptitude tidak tersedia.' : ''}
        - JANGAN menghitung total score sendiri. JANGAN menyebutkan verdict akhir.
        - Fokus pada ANALISA DESKRIPTIF yang detail dan spesifik.

        OUTPUT FORMAT:
        Return STRICTLY VALID JSON:
        { 
            "cvScore": number,
            "discScore": number,
            "aptitudeScore": number,
            "personalDataScore": number,
            "content": "Detailed markdown analysis dalam Bahasa Indonesia. Gunakan heading (###) berikut secara BERURUTAN:\\n### Analisis CV & Pengalaman Kerja\\n(evaluasi relevansi pengalaman, pendidikan, skill terhadap posisi)\\n### Analisis Kepribadian (DISC)\\n(evaluasi kecocokan profil DISC dengan tuntutan posisi)\\n### Analisis Kemampuan Kognitif\\n(evaluasi skor aptitude dibanding standar posisi)\\n### Analisis Data Pribadi\\n(evaluasi kelengkapan, domisili, usia)\\n### Kesimpulan\\n(ringkasan kelebihan dan kekurangan utama kandidat untuk posisi ini. JANGAN tulis verdict atau total score, cukup analisa objektif)"
        }
        `;

  const prompt = context + userPrompt;

  let aiResponseData = null;

  // Helper to calculate result from raw scores (DETERMINISTIC - SERVER-SIDE)
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

    // Append server-calculated verdict to AI content for display consistency
    const verdictSection = `\n\n### Verdict Akhir\n**${verdict}** — Match Score: **${finalScore}/100**\n\nRincian Perhitungan:\n- CV & Pengalaman (40%): ${scores.cvScore} × 0.40 = ${(scores.cvScore * W_CV).toFixed(1)}\n- DISC/Kepribadian (25%): ${scores.discScore} × 0.25 = ${(scores.discScore * W_DISC).toFixed(1)}\n- Aptitude/Kognitif (20%): ${scores.aptitudeScore} × 0.20 = ${(scores.aptitudeScore * W_APT).toFixed(1)}\n- Data Pribadi (15%): ${scores.personalDataScore} × 0.15 = ${(scores.personalDataScore * W_PERS).toFixed(1)}\n- **Total: ${finalScore}/100**`;

    return {
      matchScore: finalScore,
      content: textAnalysis + verdictSection,
      verdict: verdict,
      details: scores
    };
  };

  // Post-process AI scores: enforce server-side overrides
  const enforceScoreOverrides = (rawScores) => {
    const scores = { ...rawScores };

    // OVERRIDE 1: Force aptitudeScore = 0 if no aptitude data
    if (!hasAptitude) {
      scores.aptitudeScore = 0;
    }

    // OVERRIDE 2: Force discScore = 0 if no DISC data
    if (!hasDisc) {
      scores.discScore = 0;
    }

    // OVERRIDE 3: Clamp all scores to 0-100 range
    scores.cvScore = Math.max(0, Math.min(100, Math.round(scores.cvScore || 0)));
    scores.discScore = Math.max(0, Math.min(100, Math.round(scores.discScore || 0)));
    scores.aptitudeScore = Math.max(0, Math.min(100, Math.round(scores.aptitudeScore || 0)));
    scores.personalDataScore = Math.max(0, Math.min(100, Math.round(scores.personalDataScore || 0)));

    return scores;
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

      // Apply server-side overrides
      const finalScores = enforceScoreOverrides({
        cvScore: aiResponseData.cvScore,
        discScore: aiResponseData.discScore,
        aptitudeScore: aiResponseData.aptitudeScore,
        personalDataScore: aiResponseData.personalDataScore
      });

      const result = calculateFinalResult(finalScores, aiResponseData.content);
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

    // Apply server-side overrides
    const finalScores = enforceScoreOverrides({
      cvScore: aiResponseData.cvScore,
      discScore: aiResponseData.discScore,
      aptitudeScore: aiResponseData.aptitudeScore,
      personalDataScore: aiResponseData.personalDataScore
    });

    const calcResult = calculateFinalResult(finalScores, aiResponseData.content);
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
