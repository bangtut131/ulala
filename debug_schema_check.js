require('dotenv').config({ path: './server/.env' });
const { supabase } = require('./server/services/supabaseClient');

async function checkSchema() {
    console.log("Checking Schema...");
    // We can't easily query information_schema with supabase-js unless using RPC or raw SQL if enabled.
    // Instead, let's fetch one manpower request and see the ID format.

    const { data, error } = await supabase.from('manpower_requests').select('id').limit(1);

    if (error) {
        console.error("Error fetching manpower_requests:", error);
    } else if (data && data.length > 0) {
        const id = data[0].id;
        console.log(`Sample Manpower Request ID: ${id} (Type: ${typeof id})`);
    } else {
        console.log("No manpower requests found to check ID type.");
    }

    // Also check job_vacancies existing structure if possible (though we know it references it)
}

checkSchema();
