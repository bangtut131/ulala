const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load .env
const envPath = path.resolve(__dirname, '../server/.env');
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Force usage of Service Role

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLatest() {
    try {
        console.log("Fetching latest candidate with Supabase...");

        // 1. Get latest candidate
        const { data: candidate, error } = await supabase
            .from('candidates')
            .select('*')
            .order('id', { ascending: false })
            .limit(2);

        if (error) throw error;
        if (!candidate) {
            console.log("No candidates found.");
            return;
        }

        if (!candidate || candidate.length === 0) {
            console.log("No candidates found.");
            return;
        }

        const results = [];
        for (const c of candidate) {
            console.log(`Processing Candidate: ${c.full_name} (ID: ${c.id})`);

            // 2. Fetch Relations manually
            const { data: disc } = await supabase.from('disc_results').select('*').eq('candidate_id', c.id);
            const { data: aptitude } = await supabase.from('aptitude_results').select('*').eq('candidate_id', c.id);
            const { data: analysis } = await supabase.from('analyses').select('*').eq('candidate_id', c.id);

            results.push({
                ...c,
                discResult: disc,
                aptitudeResult: aptitude,
                analysis: analysis
            });
        }

        const fs = require('fs');
        fs.writeFileSync('last_5_candidates.json', JSON.stringify(results, null, 2));
        console.log("Data written to last_5_candidates.json");

    } catch (e) {
        console.error("Supabase Error:", e);
    }
}

inspectLatest();
