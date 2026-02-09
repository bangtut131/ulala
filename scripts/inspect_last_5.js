const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLast5() {
    console.log("Fetching last 5 candidates...");
    const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const fs = require('fs');
    fs.writeFileSync('last_5_candidates.json', JSON.stringify(data, null, 2));
    console.log("Written to last_5_candidates.json");

    // Print summary to console
    data.forEach(c => {
        console.log(`[${c.id}] ${c.full_name} (${c.created_at})`);
        console.log(`   - CV Text Length: ${c.cv_text ? c.cv_text.length : 0}`);
        console.log(`   - Other Info: ${c.other_info ? c.other_info.replace(/\n/g, ' | ') : 'NULL'}`);
        console.log('---');
    });
}

inspectLast5();
