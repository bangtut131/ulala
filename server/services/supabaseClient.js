const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key not found in environment variables. Database features will rely on placeholders or fail.');
}

// Standard Client (Anon/Public)
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// Admin Client (Service Role) - Use this for server-side operations like deleting files
const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase; // Fallback to standard client if no service key (deletion might fail due to RLS)

if (!supabaseServiceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set. Storage deletion may fail if RLS policies block Anon.");
}

module.exports = { supabase, supabaseAdmin };
