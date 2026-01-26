const { supabase } = require('./supabaseClient');

async function testStorage() {
    console.log("Testing Supabase Storage Connection...");

    // Check URL and Key visibility (masked)
    console.log("Supabase URL:", process.env.SUPABASE_URL ? "Set" : "MISSING");
    console.log("Supabase Key:", process.env.SUPABASE_KEY ? "Set" : "MISSING");

    try {
        // List buckets
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error("❌ Error listing buckets:", error.message);
            return;
        }

        console.log("✅ buckets found:", data.map(b => b.name));

        const bucketName = 'resumes';
        const resumeBucket = data.find(b => b.name === bucketName);

        if (!resumeBucket) {
            console.error(`❌ Bucket '${bucketName}' NOT found. You must create it in Supabase Dashboard.`);
            console.log("Hint: Go to Supabase -> Storage -> New Bucket -> 'resumes' -> Make Public (if needed)");
        } else {
            console.log(`✅ Bucket '${bucketName}' exists.`);
            console.log(`   Public: ${resumeBucket.public}`);
        }

    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

testStorage();
