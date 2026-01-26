// Scientific Norm Tables (Approximate Standard Population Distribution)
// Mapping Raw Score (0-24) to Standardized Percentile (0-100)
// Source: Adaptation from Standard DISC Normative Data (General Public)
const NORM_TABLE = {
    // D (Dominance): Average population raw is lower (~6-7). Curve rises fast.
    D: [
        5, 10, 15, 25, 35, 45, 55, 65, 75, 80,
        85, 88, 90, 92, 94, 96, 97, 98, 99, 99,
        99, 99, 99, 99, 100
    ],
    // I (Influence): Average population raw is moderate (~7-8).
    I: [
        5, 10, 15, 20, 30, 40, 50, 60, 70, 78,
        82, 85, 88, 90, 92, 94, 96, 97, 98, 99,
        99, 99, 99, 99, 100
    ],
    // S (Steadiness): Average population raw is higher (~9-10). Curve rises slower.
    S: [
        5, 5, 10, 15, 20, 25, 30, 40, 50, 55,
        60, 65, 70, 75, 80, 85, 90, 92, 95, 97,
        98, 99, 99, 99, 100
    ],
    // C (Compliance): Average population raw is low-moderate (~5-6).
    C: [
        5, 15, 25, 35, 45, 50, 60, 70, 80, 85,
        88, 90, 92, 94, 96, 97, 98, 99, 99, 99,
        99, 99, 99, 99, 100
    ]
};

export const calculateScores = (answers) => {
    // answers: { questionId: { most: "D", least: "C" } }

    const raw = {
        M: { D: 0, I: 0, S: 0, C: 0, N: 0 }, // N = No Answer/Star
        L: { D: 0, I: 0, S: 0, C: 0, N: 0 }
    };

    Object.values(answers).forEach((ans) => {
        if (ans.most) raw.M[ans.most]++;
        if (ans.least) raw.L[ans.least]++;
    });

    return raw;
};

export const convertToGraphScale = (rawCounts, type = 'graph1') => {
    // Using Scientific Norm Lookup instead of Linear Multiplier
    // Ensures accurate weighting based on trait rarity.

    const getNormScore = (trait, rawScore) => {
        // Cap raw score at 24 just in case
        const safeScore = Math.min(rawScore, 24);
        const scale = NORM_TABLE[trait];

        return scale[safeScore] || 50; // Default to mid if error
    };

    return {
        D: getNormScore('D', rawCounts.D),
        I: getNormScore('I', rawCounts.I),
        S: getNormScore('S', rawCounts.S),
        C: getNormScore('C', rawCounts.C),
    };
};

// DISC Classical Patterns Lookup
// Based on Geier / Performax / Cleaver approximate mappings
// 1 = High, -1 = Low/Low-ish (below midline)
// DISC Classical Patterns Lookup - Expanded 15 Types
// 1 = High (Above 50), -1 = Low (Below 50)
// 0 = Neutral (Doesn't matter significantly)
const CLASSICAL_PATTERNS = [
    { name: "Achiever", number: "1-1", rules: { D: 1, S: -1 } }, // High D, Low S
    { name: "Agent", number: "3-1", rules: { S: 1, I: 0 } },  // High S
    { name: "Appraiser", number: "3-3", rules: { I: 1, C: 1 } }, // High I, High C
    { name: "Counselor", number: "2-2", rules: { I: 1, S: 1 } }, // High I, High S
    { name: "Creative", number: "1-5", rules: { D: 1, I: 1, C: 1 } }, // D, I, C High
    { name: "Developer", number: "1-2", rules: { D: 1, C: 1 } }, // High D, High C
    { name: "Director", number: "1-3", rules: { D: 1, I: -1, S: -1 } }, // Pure High D
    { name: "Inspirational", number: "2-3", rules: { I: 1, D: 1 } }, // High I, High D
    { name: "Investigator", number: "3-2", rules: { C: 1, S: 0 } }, // High C
    { name: "Objective Thinker", number: "3-4", rules: { C: 1, S: 1 } }, // High C, High S
    { name: "Perfectionist", number: "3-5", rules: { C: 1, D: -1, I: -1 } }, // Pure High C
    { name: "Persuader", number: "2-1", rules: { D: 1, I: 1 } }, // High D, High I
    { name: "Practitioner", number: "2-5", rules: { S: 1, C: 1 } }, // High S, High C
    { name: "Promoter", number: "2-4", rules: { I: 1, S: -1, C: -1 } }, // Pure High I
    { name: "Result-Oriented", number: "1-4", rules: { D: 1, I: -1 } } // High D, Low I
];

export const determinePattern = (graphScores) => {
    // 1. Identify Highs (>50) and Lows (<50)
    const MIDLINE = 50;

    // Status object: 1 (High), -1 (Low)
    const status = {
        D: graphScores.D >= MIDLINE ? 1 : -1,
        I: graphScores.I >= MIDLINE ? 1 : -1,
        S: graphScores.S >= MIDLINE ? 1 : -1,
        C: graphScores.C >= MIDLINE ? 1 : -1,
    };

    // Sort traits to find Primary
    const sorted = Object.entries(graphScores).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0][0];

    // 2. Complex Pattern Matching
    // We iterate through patterns and score them based on rule matches.
    // A perfect match means all defined rules in the pattern key are met.

    let bestMatch = null;
    let maxMatchScore = -1;

    for (const pattern of CLASSICAL_PATTERNS) {
        let matchCount = 0;
        let ruleCount = 0;
        let isFail = false;

        for (const [trait, rule] of Object.entries(pattern.rules)) {
            ruleCount++;
            if (rule === 0) continue; // Ignore neutral rules if any

            // Strict Check
            if (status[trait] === rule) {
                matchCount++;
            } else {
                isFail = true;
                break;
            }
        }

        if (!isFail) {
            // Prioritize patterns with MORE specific rules (more complex match)
            if (ruleCount > maxMatchScore) {
                maxMatchScore = ruleCount;
                bestMatch = pattern;
            }
        }
    }

    // 3. Fallback Logic if no complex pattern matches
    if (!bestMatch) {
        if (primary === 'D') bestMatch = { name: "Director", number: "1-3" };
        else if (primary === 'I') bestMatch = { name: "Promoter", number: "2-4" };
        else if (primary === 'S') bestMatch = { name: "Relater", number: "3-1" }; // Agent/Relater
        else if (primary === 'C') bestMatch = { name: "Investigator", number: "3-5" }; // Analyzer
    }

    return `${bestMatch.name} #${bestMatch.number}`;
};

// Comprehensive DISC Profile Analysis Dictionary
const PROFILE_DATA = {
    // 1. ACHIEVER (High D, Low S)
    "Achiever": {
        strength: ["Sangat mandiri dan inisiatif tinggi", "Fokus tajam pada hasil akhir", "Berani mengambil risiko terukur", "Tidak kenal takut menghadapi rintangan", "Pemecah masalah yang cepat"],
        improve: ["Belajar untuk lebih sabar dengan proses", "Kurangi sikap defensif saat dikritik", "Delegasikan tugas detail ke orang lain", "Lebih peka terhadap perasaan tim"],
        tendencies: { goal: "Hasil nyata dan kemenangan", judgeOthers: "Kompetensi dan kecepatan", influenceOthers: "Ketegasan tindakan", valueToOrg: "Pendorong produktivitas utama", overUse: "Otoriter", underPressure: "Menjadi tidak sabar dan kasar", fears: "Gagal mencapai target" }
    },
    // 2. AGENT (High S, Neutral I)
    "Agent": {
        strength: ["Sangat suportif dan peduli", "Pendengar yang empatik", "Menjaga harmoni tim", "Loyal dan dapat diandalkan", "Bekerja baik dalam kerangka yang jelas"],
        improve: ["Lebih tegas menolak permintaan berlebih", "Berani menghadapi konflik", "Kurangi kecenderungan memendam perasaan", "Lebih inisiatif tanpa menunggu instruksi"],
        tendencies: { goal: "Penerimaan dan stabilitas", judgeOthers: "Kebaikan hati", influenceOthers: "Pemahaman dan toleransi", valueToOrg: "Peminim konflik", overUse: "Terlalu lunak", underPressure: "Mengalah atau pasif agresif", fears: "Konfrontasi" }
    },
    // 3. APPRAISER (High I, High C)
    "Appraiser": {
        strength: ["Kritis namun persuasif", "Mampu menjelaskan detail dengan menarik", "Sopan dan diplomatis", "Mengutamakan kualitas presentasi", "Analitis namun komunikatif"],
        improve: ["Kurangi over-analisis yang menghambat aksi", "Terima bahwa tidak ada yang sempurna", "Lebih langsung pada poin utama", "Kelola waktu dengan lebih baik"],
        tendencies: { goal: "Pengakuan atas keahlian", judgeOthers: "Metode dan presentasi", influenceOthers: "Data dan diplomasi", valueToOrg: "Quality Assurance yang komunikatif", overUse: "Kritik terselubung", underPressure: "Sarkastik", fears: "Kritik atas standar kerja" }
    },
    // 4. COUNSELOR (High I, High S)
    "Counselor": {
        strength: ["Sangat hangat dan mudah didekati", "Membangun hubungan jangka panjang", "Pendengar yang sabar", "Membuat orang lain merasa nyaman", "Persuasif secara halus"],
        improve: ["Lebih fokus pada penyelesaian tugas", "Tegas dalam menetapkan batas waktu", "Kurangi obrolan yang tidak produktif", "Belajar berkata 'tidak'"],
        tendencies: { goal: "Persahabatan dan kebahagiaan", judgeOthers: "Penyambutan dan respon positif", influenceOthers: "Hubungan personal", valueToOrg: "Perekat tim", overUse: "Toleransi berlebih", underPressure: "Menjadi terlalu emosional", fears: "Konflik interpersonal" }
    },
    // 5. CREATIVE (High D, High I, High C)
    "Creative": {
        strength: ["Inovatif dan visioner", "Cepat melihat solusi alternatif", "Dinamis dan penuh ide", "Mampu memimpin perubahan", "Perfeksionis dalam hasil"],
        improve: ["Fokus pada satu hal hingga selesai", "Kurangi keinginan mengontrol semua aspek", "Lebih realistis dengan waktu", "Terima bantuan orang lain"],
        tendencies: { goal: "Dominasi melalui inovasi", judgeOthers: "Ide dan kecerdasan", influenceOthers: "Visi masa depan", valueToOrg: "Inovator perubahan", overUse: "Berubah-ubah arah", underPressure: "Frustrasi jika ide ditolak", fears: "Rutinitas membosankan" }
    },
    // 6. DEVELOPER (High D, High C)
    "Developer": {
        strength: ["Mandiri dan sangat fokus", "Pemecah masalah kompleks", "Standar kerja sangat tinggi", "Gigih mencari solusi teknis", "Tidak mudah menyerah"],
        improve: ["Lebih komunikatif dengan tim", "Kurangi sikap perfeksionis kaku", "Belajar mempercayai orang lain", "Lebih santai menghadapi kesalahan kecil"],
        tendencies: { goal: "Solusi sempurna", judgeOthers: "Kemampuan teknis", influenceOthers: "Hasil kerja nyata", valueToOrg: "Problem solver teknis", overUse: "Bekerja sendirian", underPressure: "Kritis dan menarik diri", fears: "Standar rendah" }
    },
    // 7. DIRECTOR (Pure High D) -> Existing fallback
    "Director": {
        strength: ["Berorientasi hasil", "Tegas mengambil keputusan", "Memegang kendali", "Berani ambil risiko", "Visioner"],
        improve: ["Sabar mendengarkan", "Kurangi arogansi", "Validasi perasaan orang lain", "Jelaskan alasan instruksi"],
        tendencies: { goal: "Kontrol dan Hasil", judgeOthers: "Hasil", influenceOthers: "Instruksi", valueToOrg: "Pemimpin", overUse: "Memaksa", underPressure: "Agresif", fears: "Hilang kendali" }
    },
    // 8. INSPIRATIONAL (High I, High D)
    "Inspirational": {
        strength: ["Karisma pemimpin yang kuat", "Sangat persuasif dan berani", "Mampu memobilisasi massa", "Optimis dan percaya diri", "Tidak takut tampil beda"],
        improve: ["Perhatikan detail operasional", "Dengarkan saran bawahan", "Jangan impulsif mengambil keputusan", "Follow-up janji yang dibuat"],
        tendencies: { goal: "Status dan pengaruh", judgeOthers: "Keberanian dan inisiatif", influenceOthers: "Karisma dan visi", valueToOrg: "Penggerak perubahan", overUse: "Manipulatif", underPressure: "Meledak-ledak", fears: "Kehilangan muka/status" }
    },
    // 9. INVESTIGATOR (High C) -> Often called OBJECTIVE THINKER fallback
    "Investigator": {
        strength: ["Sangat teliti dan akurat", "Berbasis data dan fakta", "Tenang dan analitis", "Terorganisir dengan rapi", "Sistematis"],
        improve: ["Lebih cepat mengambil keputusan", "Berani ambil risiko", "Lebih terbuka secara sosial", "Kurangi kritik"],
        tendencies: { goal: "Kebenaran data", judgeOthers: "Akurasi", influenceOthers: "Fakta", valueToOrg: "Analisis data", overUse: "Analisis paralisis", underPressure: "Menarik diri", fears: "Salah data" }
    },
    // 10. OBJECTIVE THINKER (High C, High S)
    "Objective Thinker": {
        strength: ["Berpikir jernih dan logis", "Sabar dalam analisis", "Diplomatis dan hati-hati", "Sangat dependable", "Metodis"],
        improve: ["Lebih spontan", "Berani mengungkapkan opini", "Jangan menunggu data 100%", "Lebih fleksibel"],
        tendencies: { goal: "Ketepatan proses", judgeOthers: "Konsistensi", influenceOthers: "Logika", valueToOrg: "Perencana sistem", overUse: "Kaku aturan", underPressure: "Bingung tanpa data", fears: "Kekacauan" }
    },
    // 11. PERFECTIONIST (Pure High C, no D/I)
    "Perfectionist": {
        strength: ["Standar kualitas ekstrem", "Akurasi tinggi", "Sangat hati-hati", "Prosedural", "Disiplin"],
        improve: ["Terima kesalahan manusiawi", "Delegasikan tugas", "Fokus deadline vs kualitas", "Lebih rileks"],
        tendencies: { goal: "Kesempurnaan", judgeOthers: "Kepatuhan", influenceOthers: "Aturan", valueToOrg: "Quality Control", overUse: "Menghakimi", underPressure: "Cemas", fears: "Kritik" }
    },
    // 12. PERSUADER (High D, High I)
    "Persuader": {
        strength: ["Sangat meyakinkan", "Antusias dan mandiri", "Pemimpin yang 'fun'", "Berinisiatif tinggi", "Jago negosiasi"],
        improve: ["Konsistensi penyelesaian tugas", "Kelola detail admin", "Kurangi janji berlebih", "Lebih rendah hati"],
        tendencies: { goal: "Otoritas dan popularitas", judgeOthers: "Verbal skills", influenceOthers: "Persuasi antusias", valueToOrg: "Sales Leader", overUse: "Over-selling", underPressure: "Menyerang verbal", fears: "Rutin membosankan" }
    },
    // 13. PRACTITIONER (High S, High C)
    "Practitioner": {
        strength: ["Ahli dalam bidang teknis", "Sangat setia dan tekun", "Pelayanan prima", "Menjaga standar tinggi", "Rekan kerja yang menyenangkan"],
        improve: ["Lebih percaya diri", "Berani promosi diri", "Keluar dari zona nyaman", "Adaptasi perubahan cepat"],
        tendencies: { goal: "Keahlian spesifik", judgeOthers: "Ketulusan", influenceOthers: "Pelayanan", valueToOrg: "Spesialis Teknis", overUse: "Terlalu detail", underPressure: "Terluka perasaannya", fears: "Perubahan metode" }
    },
    // 14. PROMOTER (Pure High I) -> Existing fallback
    "Promoter": {
        strength: ["Optimis", "Verbal", "Sosial", "Inspirator", "Kreatif"],
        improve: ["Manajemen waktu", "Follow-up", "Kurangi bicara", "Fokus"],
        tendencies: { goal: "Popularitas", judgeOthers: "Verbal", influenceOthers: "Pujian", valueToOrg: "Motivator", overUse: "Impulsif", underPressure: "Emosional", fears: "Penolakan" }
    },
    // 15. RESULT-ORIENTED (High D, Low I)
    "Result-Oriented": {
        strength: ["Sangat objektif", "To the point", "Efisien waktu", "Mandiri", "Tegas"],
        improve: ["Senyum dan sapa", "Jelaskan 'mengapa'", "Validasi tim", "Kurangi skeptis"],
        tendencies: { goal: "Hasil instan", judgeOthers: "Hasil", influenceOthers: "Fakta keras", valueToOrg: "Eksekutor", overUse: "Kasar", underPressure: "Mengambil alih paksa", fears: "Dimanfaatkan" }
    },
    // Fallback Relater
    "Relater": {
        strength: ["Pendengar", "Stabil", "Sabar", "Loyal", "Harmonis"],
        improve: ["Tegas", "Berani beda", "Inisiatif", "Cepat"],
        tendencies: { goal: "Harmoni", judgeOthers: "Loyalitas", influenceOthers: "Dukungan", valueToOrg: "Support", overUse: "Pasif", underPressure: "Mengalah", fears: "Konflik" }
    }
};

export const getAnalysisText = (patternFull) => {
    // patternFull format: "Relater #17" or "Promoter #30"
    const name = patternFull.split(' ')[0]; // e.g. "Relater"

    // Default fallback if name not found exactly
    let data = PROFILE_DATA[name];

    if (!data) {
        // Fallback logic
        if (patternFull.includes("D")) data = PROFILE_DATA["Director"];
        else if (patternFull.includes("I")) data = PROFILE_DATA["Promoter"];
        else if (patternFull.includes("S")) data = PROFILE_DATA["Relater"];
        else if (patternFull.includes("C")) data = PROFILE_DATA["Analyzer"];
        else data = PROFILE_DATA["Relater"]; // Safe default
    }

    return data;
};

export const calculateConsistency = (graph1, graph2) => {
    // Calculate absolute difference for each trait
    const diffD = Math.abs(graph1.D - graph2.D);
    const diffI = Math.abs(graph1.I - graph2.I);
    const diffS = Math.abs(graph1.S - graph2.S);
    const diffC = Math.abs(graph1.C - graph2.C);

    const totalDiff = diffD + diffI + diffS + diffC;

    // Thresholds (heuristic)
    // 0-20: Tinggi (Sangat Konsisten)
    // 21-50: Sedang (Cukup Konsisten)
    // >50: Rendah (Perubahan Signifikan/Stress)

    let level = "Tinggi";
    let description = "Grafik menunjukkan pola yang sangat konsisten antara perilaku di tempat kerja dan perilaku alami. Ini mengindikasikan bahwa individu merasa nyaman dan minim tekanan dalam menjalankan perannya saat ini.";

    if (totalDiff > 50) {
        level = "Rendah";
        description = "Terdapat perubahan signifikan antara perilaku alami dan perilaku kerja. Ini mengindikasikan individu sedang melakukan penyesuaian besar-besaran untuk memenuhi tuntutan peran, yang berpotensi menimbulkan stress atau kelelahan jika berlangsung lama.";
    } else if (totalDiff > 20) {
        level = "Sedang";
        description = "Terlihat adanya penyesuaian perilaku yang wajar antara situasi kerja dan alami. Individu cukup fleksibel beradaptasi tanpa kehilangan jati dirinya.";
    }

    return { level, description, totalDiff };
};

export const getJobRecommendations = (primaryPattern) => {
    // Based on Primary Trait / Pattern Name
    const map = {
        "Director": [
            "Manager / Eksekutif", "Sales Manager", "Project Manager", "Entrepreneur", "Kepala Operasional", "Konsultan Strategis"
        ],
        "Promoter": [
            "Public Relations", "Marketing / Sales", "Trainer / Pembicara", "Customer Service", "Recruiter", "Entertainer"
        ],
        "Relater": [
            "Human Resources", "Customer Support", "Konselor", "Administrasi Medis", "Guru / Pengajar", "Layanan Pelanggan"
        ],
        "Analyzer": [
            "Akuntan / Finance", "Programmer / IT", "Engineer", "Quality Control", "Data Analyst", "Peneliti"
        ],
        "Persuader": ["Sales Executive", "Negosiator", "Manager Pemasaran"],
        "Practitioner": ["Teknisi Spesialis", "Ahli Logistik", "Researcher"],
        "Objective Thinker": ["System Analyst", "Perencana Keuangan"],
        "Counselor": ["HR Specialist", "Psikolog", "Konsultan Pendidikan"]
    };

    // Extract name from "Director #11" -> "Director"
    const baseName = primaryPattern.split(' #')[0];

    // Fallback logic
    if (map[baseName]) return map[baseName];

    if (baseName.includes("Director")) return map["Director"];
    if (baseName.includes("Promoter")) return map["Promoter"];
    if (baseName.includes("Relater")) return map["Relater"];
    if (baseName.includes("Analyzer")) return map["Analyzer"];

    return ["Posisi Generalist", "Staff Administrasi", "Support Roles"];
};

export const evaluateJobFit = (primaryPattern, appliedPosition) => {
    if (!appliedPosition) return null;

    const baseName = primaryPattern.split(' #')[0];
    const position = appliedPosition.toLowerCase();

    // Keywords for each profile for simple matching
    const keywords = {
        "Director": ["manager", "kepala", "lead", "direktur", "sales", "project", "supervisor", "koordinator", "head", "chief"],
        "Promoter": ["marketing", "sales", "pr", "humas", "trainer", "komunikasi", "sosial", "kreatif", "mc", "host"],
        "Relater": ["admin", "hr", "support", "layanan", "guru", "perawat", "staf", "sekretaris", "customer"],
        "Analyzer": ["akuntan", "finance", "it", "data", "quality", "teknis", "engineer", "analis", "program", "developer"]
    };

    let targetKeywords = [];
    if (keywords[baseName]) targetKeywords = keywords[baseName];
    else if (baseName.includes("Director")) targetKeywords = keywords["Director"];
    else if (baseName.includes("Promoter")) targetKeywords = keywords["Promoter"];
    else if (baseName.includes("Relater")) targetKeywords = keywords["Relater"];
    else if (baseName.includes("Analyzer")) targetKeywords = keywords["Analyzer"];

    // Check match (basic keyword inclusion)
    const isMatch = targetKeywords.some(k => position.includes(k));

    // Detailed analysis text
    let analysisText = "";
    if (isMatch) {
        analysisText = "Posisi ini sangat selaras dengan profil kepribadian Anda, memungkinkan Anda bekerja secara maksimal dengan gaya alami Anda.";
    } else {
        analysisText = "Posisi ini mungkin memerlukan adaptasi dari gaya alami Anda. Pastikan Anda menyadari tuntutan peran ini.";
    }

    return {
        position: appliedPosition,
        isMatch: isMatch,
        message: isMatch
            ? "COCOK (Highly Recommended)"
            : "MEMERLUKAN ADAPTASI (Adaptable)",
        analysis: analysisText
    };
};

export const generateConclusion = (profile1, profile2, consistency) => {
    // Combine insights
    return `Kandidat memiliki profil dasar **${profile2.pattern.split(' #')[0]}** yang secara alami ${profile2.analysis.tendencies.goal.toLowerCase()}. ` +
        `Di lingkungan kerja, kandidat beradaptasi menjadi **${profile1.pattern.split(' #')[0]}**. ` +
        `Tingkat konsistensi **${consistency.level}** menunjukkan bahwa kandidat ${consistency.level === 'Rendah' ? 'membutuhkan energi adaptasi yang besar' : 'dapat bekerja dengan aliran energi yang natural'}.`;
};

export const checkValidity = (graphScores) => {
    const { D, I, S, C } = graphScores;
    const scores = [D, I, S, C];

    // 1. Check for COMPRESSION (All scores huddled in middle)
    // If all scores are between 35 and 65, the profile is "Flat".
    // This indicates: Indecision, Confusion, or trying to be "Average"
    const isCompressed = scores.every(s => s > 35 && s < 65);
    if (isCompressed) {
        return {
            isValid: false,
            type: "Compression",
            title: "Profil Datar (Flat Profile)",
            description: "Semua skor berada di area rata-rata. Ini mengindikasikan kandidat mungkin bingung, kurang paham pertanyaan, atau berusaha bermain aman (tidak ingin menonjol). Hasil mungkin kurang tajam."
        };
    }

    // 2. Check for OVER-SHIFT (Faking Good / Superman Complex)
    // If 3 or more traits are High (> 75)
    // It's statistically unlikely to be high in almost everything.
    const highCount = scores.filter(s => s > 75).length;
    if (highCount >= 3) {
        return {
            isValid: false, // Or "Warning"
            type: "Over-Shift",
            title: "Indikasi 'Faking Good' (Over-Shift)",
            description: "Terlalu banyak atribut positif yang tinggi (>3 Tipe). Kandidat mungkin berusaha terlihat 'Sempurna' atau menjawab berdasarkan apa yang 'seharusnya' bukan apa adanya."
        };
    }

    // 3. Check for UNDER-SHIFT (Overly Critical)
    // If 3 or more traits are Low (< 30)
    // "I am nothing"
    const lowCount = scores.filter(s => s < 30).length;
    if (lowCount >= 3) {
        return {
            isValid: false,
            type: "Under-Shift",
            title: "Profil Rendah (Under-Shift)",
            description: "Terlalu banyak skor rendah. Kandidat mungkin sedang stres berat, depresi situasi kerja, atau sangat kritis terhadap diri sendiri sehingga merasa tidak memiliki kompetensi."
        };
    }

    return {
        isValid: true,
        type: "Valid",
        title: "Valid",
        description: "Pola jawaban menunjukkan variasi yang wajar dan dapat dipercaya."
    };
};
