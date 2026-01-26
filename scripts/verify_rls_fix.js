const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

async function verifyRLS() {
    console.log('--- Verifying RLS Fix (Insert Permission) ---');
    console.log(`URL: ${process.env.SUPABASE_URL}`);

    // CRITICAL: Use ANON KEY to mimic restrictions
    const anonKey = process.env.SUPABASE_KEY;
    console.log("Using Key: ...", anonKey.slice(-5));

    const supabase = createClient(process.env.SUPABASE_URL, anonKey);

    const testCandidate = {
        full_name: 'RLS Verification User',
        email: 'rls_test_' + Date.now() + '@test.com',
        position: 'Tester',
        status: 'New'
    };

    try {
        console.log("Attempting INSERT with ANON KEY...");
        const { data, error } = await supabase
            .from('candidates')
            .insert([testCandidate])
            .select()
            .single();

        if (error) {
            console.error("❌ INSERT Failed (RLS issue likely persists):", error.message);
        } else {
            console.log("✅ INSERT Successful! RLS policy is fixing.");
            console.log("Created ID:", data.id);

            // Clean up (might fail if DELETE RLS is strict, but that's fine)
            // We use Service Role for cleanup to be sure
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const adminClient = createClient(process.env.SUPABASE_URL, serviceKey);
            await adminClient.from('candidates').delete().eq('id', data.id);
            console.log("   (Test record cleaned up)");
        }

    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

verifyRLS();
