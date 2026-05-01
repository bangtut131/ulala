require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const { supabaseAdmin } = require('../server/services/supabaseClient');

async function main() {
    console.log('Adding screening_status column to candidates...');
    
    // Try to update a non-existent row to check if column exists
    const { error: testErr } = await supabaseAdmin
        .from('candidates')
        .update({ screening_status: 'pending' })
        .eq('id', -999);
    
    if (testErr && testErr.message.includes('screening_status')) {
        console.log('Column does not exist, need to add via Supabase SQL Editor.');
        console.log('Run this SQL:\n');
        console.log("ALTER TABLE candidates ADD COLUMN screening_status TEXT DEFAULT 'pending';");
        process.exit(1);
    } else {
        console.log('✅ Column screening_status already exists or was added!');
    }
}

main().catch(console.error);
