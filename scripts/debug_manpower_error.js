const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

async function debugManpower() {
    console.log('--- Debugging Manpower Request Error ---');
    console.log(`URL: ${process.env.SUPABASE_URL}`);

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("Attempting query with relationship...");
        const { data, error } = await supabase
            .from('manpower_requests')
            .select(`
                *,
                candidates!request_id (id, status)
            `)
            .limit(1);

        if (error) {
            console.error("❌ Error caught:", error);
            console.error("Message:", error.message);
            console.error("Hint:", error.hint);
        } else {
            console.log("✅ Query Successful!");
            console.log("Data:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

debugManpower();
