const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

async function verifyConnection() {
    console.log('--- Verification Tool ---');
    console.log(`Connecting to: ${process.env.SUPABASE_URL}`);

    if (!process.env.SUPABASE_URL.includes('tzynvsakwbbrwzwxrnfc')) {
        console.error('❌ ERROR: .env is still pointing to the old or wrong URL!');
        console.log(`Current: ${process.env.SUPABASE_URL}`);
        return;
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data, error } = await supabase.from('job_vacancies').select('*').limit(1);
        if (error) {
            console.error('❌ Connection Failed:', error.message);
        } else {
            console.log('✅ Connection Successful!');
            console.log(`Fetched ${data.length} row(s) from 'job_vacancies'.`);
            console.log('Migration Verified.');
        }
    } catch (e) {
        console.error('❌ Unexpected Error:', e);
    }
}

verifyConnection();
