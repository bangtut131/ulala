const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const https = require('https');

// Load environment variables from server/.env
const envPath = path.resolve(__dirname, '../server/.env');
dotenv.config({ path: envPath });

const OLD_SUPABASE_URL = process.env.SUPABASE_URL;
const OLD_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// NEW Credentials (Hardcoded for this run as provided by user)
const NEW_SUPABASE_URL = 'https://tzynvsakwbbrwzwxrnfc.supabase.co';
const NEW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6eW52c2Frd2Jicnd6d3hybmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNDc3MTMsImV4cCI6MjA4NDcyMzcxM30.Xc2fR-xJuNlfWbGsZgY4oH1lNABGVGTzt_GdgJGT9xs';
const NEW_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6eW52c2Frd2Jicnd6d3hybmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE0NzcxMywiZXhwIjoyMDg0NzIzNzEzfQ.PSJtiIOR-tezHfgOX-mGC4qgJXnMwJQ-6JDzRNnnD1Q';

async function migrateData() {
    console.log('--- Supabase FULL Migration Tool ---');
    console.log(`From: ${OLD_SUPABASE_URL}`);
    console.log(`To:   ${NEW_SUPABASE_URL}`);

    const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY);
    const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY);

    // 1. MIGRATE TABLES
    // Order matters: manpower_requests -> job_vacancies -> candidates
    const tables = ['manpower_requests', 'job_vacancies', 'candidates'];

    for (const table of tables) {
        console.log(`\n--- Migrating Table: ${table} ---`);

        // Fetch all data from OLD
        const { data: rows, error: fetchError } = await oldSupabase
            .from(table)
            .select('*');

        if (fetchError) {
            console.error(`❌ Error fetching from OLD ${table}:`, fetchError.message);
            continue;
        }

        console.log(`✅ Fetched ${rows.length} rows from OLD ${table}.`);

        if (rows.length === 0) continue;

        // Insert into NEW
        const { error: insertError } = await newSupabase
            .from(table)
            .upsert(rows);

        if (insertError) {
            console.error(`❌ Error inserting into NEW ${table}:`, insertError.message);
        } else {
            console.log(`✅ Successfully migrated ${rows.length} rows to NEW ${table}.`);
        }
    }

    // 2. MIGRATE STORAGE
    const buckets = ['resumes'];
    console.log('\n--- Migrating Storage Buckets ---');

    for (const bucket of buckets) {
        console.log(`Processing bucket: ${bucket}`);

        // List files in old bucket
        const { data: files, error: listError } = await oldSupabase
            .storage
            .from(bucket)
            .list('', { limit: 100, offset: 0 });

        if (listError) {
            console.error(`❌ Error listing files in bucket ${bucket}:`, listError.message);
            continue;
        }

        console.log(`Found ${files.length} files in ${bucket}.`);

        for (const file of files) {
            if (file.name === '.emptyFolderPlaceholder') continue; // Skip placeholder

            console.log(`Copying file: ${file.name}...`);

            // Download from OLD
            const { data: methodData, error: downloadError } = await oldSupabase
                .storage
                .from(bucket)
                .download(file.name);

            if (downloadError) {
                console.error(`  ❌ Failed to download ${file.name}:`, downloadError.message);
                continue;
            }

            // Upload to NEW
            const { error: uploadError } = await newSupabase
                .storage
                .from(bucket)
                .upload(file.name, methodData, {
                    upsert: true,
                    contentType: file.metadata?.mimetype
                });

            if (uploadError) {
                console.error(`  ❌ Failed to upload ${file.name}:`, uploadError.message);
            } else {
                console.log(`  ✅ Copied ${file.name}`);
            }
        }
    }

    console.log('\n--- Migration Complete ---');
}

migrateData();
