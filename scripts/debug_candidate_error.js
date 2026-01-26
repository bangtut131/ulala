const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

async function debugCandidate() {
    console.log('--- Debugging Candidate Error ---');
    console.log(`URL: ${process.env.SUPABASE_URL}`);

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("Attempting query for candidate...");
        const { data, error } = await supabase
            .from('candidates')
            .select(`
                *,
                disc_results (*),
                analyses (*)
            `)
            .eq('id', 60)
            .single();

        if (error) {
            console.error("❌ Error caught:", error);
            console.error("Message:", error.message);
        } else {
            console.log("✅ Query Successful!");
            console.log("Data:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

debugCandidate();
