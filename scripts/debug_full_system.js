const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

async function debugSystem() {
    console.log('--- Debugging Full System ---');
    console.log(`URL: ${process.env.SUPABASE_URL}`);

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Check Candidate 60 directly
        console.log("\n1. Checking Candidate 60 existence...");
        const { data: c60, error: err60 } = await supabase.from('candidates').select('id, full_name').eq('id', 60).single();
        if (err60) console.log("   ❌ Candidate 60 fetch failed:", err60.message);
        else console.log("   ✅ Candidate 60 found:", c60.full_name);

        // 2. Check Analysis for Candidate 60 manually
        console.log("\n2. Checking Analysis for Candidate 60 (manual lookup)...");
        const { data: a60, error: errA60 } = await supabase.from('analyses').select('*').eq('candidate_id', 60);
        if (errA60) console.log("   ❌ Analysis fetch failed:", errA60.message);
        else {
            console.log(`   ℹ️ Found ${a60.length} analysis rows for candidate 60.`);
            if (a60.length > 0) console.log("      Sample:", JSON.stringify(a60[0]).substring(0, 100) + "...");
        }

        // 3. Test Join (The logic that fails/returns empty)
        console.log("\n3. Testing Supabase Join (candidates + analyses)...");
        const { data: joinData, error: joinError } = await supabase
            .from('candidates')
            .select('id, full_name, analyses(*)')
            .eq('id', 60)
            .single();

        if (joinError) {
            console.log("   ❌ JOIN Query Failed:", joinError.message);
        } else {
            console.log("   ✅ JOIN Query Successful.");
            const analyses = joinData.analyses;
            console.log(`   ℹ️ Linked Analyses count: ${Array.isArray(analyses) ? analyses.length : (analyses ? 1 : 0)}`);
            // Check if it's returning empty array despite data existing in step 2
            if (a60 && a60.length > 0 && (!analyses || analyses.length === 0)) {
                console.log("   ❗ WARNING: Data exists (Step 2) but JOIN failed to link it (Step 3). Foreign Key issue?");
            }
        }

        // 4. Test Create & Delete (Cascade Check)
        console.log("\n4. Testing CREATE and DELETE (Cascade)...");
        const { data: newC, error: createErr } = await supabase.from('candidates').insert([{ full_name: 'Debug User', email: 'debug@test.com' }]).select().single();
        if (createErr) {
            console.log("   ❌ Create Test Candidate Failed:", createErr.message);
        } else {
            console.log("   ✅ Created Test Candidate ID:", newC.id);
            // Create dummy analysis
            const { error: createAnaErr } = await supabase.from('analyses').insert([{ candidate_id: newC.id, verdict: 'Test' }]);
            if (createAnaErr) console.log("   ❌ Create Test Analysis Failed:", createAnaErr.message);
            else console.log("   ✅ Created Test Analysis linked to ID", newC.id);

            // Now DELETE
            const { error: delErr } = await supabase.from('candidates').delete().eq('id', newC.id);
            if (delErr) {
                console.log("   ❌ DELETE Failed (Cascading issue?):", delErr.message);
            } else {
                console.log("   ✅ DELETE Successful (Cascade works or no constraint blocking).");
            }
        }

    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

debugSystem();
