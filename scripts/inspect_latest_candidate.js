const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './server/.env' }); // Relative to root CWD

// Fallback if .env not loaded (User might need to provide keys or run in context)
// For now, assuming .env exists in root or parent
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY/SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLatest() {
    console.log("Fetching latest candidate...");
    const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!data) {
        console.log("No candidates found.");
        return;
    }

    const fs = require('fs');
    fs.writeFileSync('latest_candidate.json', JSON.stringify(data, null, 2));
    console.log("Data written to latest_candidate.json");
}

inspectLatest();
