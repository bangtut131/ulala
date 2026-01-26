const { supabaseAdmin } = require('../server/services/supabaseClient');

async function diagnose() {
    console.log("=== DB DIAGNOSTIC ===");

    // 1. Manpower Requests
    console.log("\n1. Testing 'manpower_requests'...");
    const { data: mr, error: mrErr } = await supabaseAdmin.from('manpower_requests').select('count', { count: 'exact', head: true });
    if (mrErr) console.error("   FAIL:", mrErr.message);
    else console.log("   OK. Count:", mr.length); // head:true returns null data but count

    // Test relation query used in findMany
    console.log("   Testing Relation: manpower_requests + candidates!request_id...");
    const { error: relErr } = await supabaseAdmin
        .from('manpower_requests')
        .select('id, candidates!request_id(id)')
        .limit(1);

    if (relErr) console.error("   RELATION FAIL:", relErr.message);
    else console.log("   RELATION OK.");

    // 2. Candidates
    console.log("\n2. Testing 'candidates'...");
    const { error: cErr } = await supabaseAdmin.from('candidates').select('count', { count: 'exact', head: true });
    if (cErr) console.error("   FAIL:", cErr.message);
    else console.log("   OK.");

    // 3. Job Vacancies
    console.log("\n3. Testing 'job_vacancies'...");
    const { error: jErr } = await supabaseAdmin.from('job_vacancies').select('count', { count: 'exact', head: true });
    if (jErr) console.error("   FAIL:", jErr.message);
    else console.log("   OK.");
}

diagnose();
