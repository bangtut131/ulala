const { supabaseAdmin } = require('../server/services/supabaseClient');

async function testExplicitJoin() {
    console.log("Testing Explicit Join...");
    const { data, error } = await supabaseAdmin
        .from('candidates')
        .select(`
            full_name,
            disc_results!fk_disc_candidate (id),
            analyses!fk_analyses_candidate (match_score),
            aptitude_results!fk_aptitude_candidate (score)
        `)
        .limit(1);

    if (error) {
        console.error("Explicit Join Failed:", error);
    } else {
        console.log("Explicit Join Success!");
        console.log(JSON.stringify(data, null, 2));
    }
}

testExplicitJoin();
