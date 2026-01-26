require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use Service Key to bypass RLS if needed, or Anon if public

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLatest() {
    console.log("Connecting to Supabase...");

    // 1. Get Latest Candidate
    const { data: candidates, error: cErr } = await supabase
        .from('candidates')
        .select(`
            *,
            aptitude_results (*)
        `)
        .order('created_at', { ascending: false })
        .limit(1);

    if (cErr) {
        console.error("Error fetching candidate:", cErr);
        return;
    }

    if (!candidates || candidates.length === 0) {
        console.log("No candidates found.");
        return;
    }

    const candidate = candidates[0];
    console.log(`\nLatest Candidate: ${candidate.full_name} (ID: ${candidate.id})`);
    console.log(`Created At: ${candidate.created_at}`);

    // 2. Check Aptitude Results
    if (candidate.aptitude_results && candidate.aptitude_results.length > 0) {
        const res = candidate.aptitude_results[0];
        console.log("\n[SUCCESS] Aptitude Result Found!");
        console.log(`Score: ${res.score}`);
        console.log(`Correct: ${res.correct_count} / ${res.total_count}`);
        console.log(`Timestamp: ${res.created_at}`);
    } else {
        console.log("\n[WARNING] No Aptitude Result found for this candidate.");

        // Check if maybe it's orphan? (Unlikely but possible if relation mapping failed)
        const { data: orphan, error: oErr } = await supabase
            .from('aptitude_results')
            .select('*')
            .eq('candidate_id', candidate.id);

        if (orphan && orphan.length > 0) {
            console.log("[INFO] Found result in table, but relation join failed. Check foreign keys.");
            console.log(orphan[0]);
        }
    }
}

verifyLatest();
