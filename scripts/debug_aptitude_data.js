const { supabase } = require('../server/services/supabaseClient');

async function debugAptitude() {
    console.log("Checking DB connections...");

    // 1. Get Latest Candidate
    const { data: candidates, error: cErr } = await supabase
        .from('candidates')
        .select('id, full_name')
        .order('created_at', { ascending: false })
        .limit(1);

    if (cErr || !candidates.length) {
        console.error("Candidates missing:", cErr);
        return;
    }
    const candidate = candidates[0];
    console.log(`Latest Candidate: ${candidate.full_name} (ID: ${candidate.id})`);

    // 2. Check Aptitude Result directly
    const { data: apt, error: aErr } = await supabase
        .from('aptitude_results')
        .select('*')
        .eq('candidate_id', candidate.id);

    console.log("Raw Aptitude Query Result:");
    if (aErr) console.error(aErr);
    else console.log(apt);

    // 3. Check Relation via Candidates
    const { data: joinCheck, error: jErr } = await supabase
        .from('candidates')
        .select(`
            id,
            aptitude_results (*)
        `)
        .eq('id', candidate.id);

    console.log("Join Check:");
    if (jErr) console.error(jErr);
    else console.log(JSON.stringify(joinCheck, null, 2));
}

debugAptitude();
