const { supabase } = require('../server/services/supabaseClient');

async function debugAnalysisScores() {
    console.log("Checking Analysis Scores...");

    // 1. Get Latest Analysis
    const { data: analyses, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !analyses.length) {
        console.error("Analysis missing:", error);
        return;
    }
    const latest = analyses[0];
    console.log(`Latest Analysis ID: ${latest.id}`);
    console.log(`Candidate ID: ${latest.candidate_id}`);
    console.log(`Total Match Score: ${latest.match_score}`);
    console.log("--- Detailed Scores ---");
    console.log(`CV Score: ${latest.cv_score}`);
    console.log(`DISC Score: ${latest.disc_score}`);
    console.log(`Aptitude Score: ${latest.aptitude_score}`);
    console.log(`Personal Data Score: ${latest.personal_data_score}`);
}

debugAnalysisScores();
