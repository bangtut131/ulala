const { getSettings, updateSettings } = require('./settings');

async function testSettingsDB() {
    console.log("--- Testing Settings DB Persistence ---");

    // 1. Read Current
    console.log("Reading initial settings...");
    const initial = await getSettings();
    console.log("Initial Provider:", initial.aiProvider);

    // 2. Update Randomly
    const specialVal = "Test-" + Date.now();
    console.log("Updating 'systemPrompt' to:", specialVal);
    const success = await updateSettings({ systemPrompt: specialVal });

    if (success) {
        console.log("✅ Update Success");
    } else {
        console.error("❌ Update Failed");
        return;
    }

    // 3. Read Again (Verify Persistence)
    console.log("Reading settings again...");
    // Clear cache by waiting or just trust DB hit if cache logic allows (we set cache in memory, so restarting script simulates fresh fetch)
    // Actually, since we are in same process, we might hit cache. 
    // updateSettings clears cache, so it should be fine.

    const secondRead = await getSettings();
    console.log("Read 'systemPrompt':", secondRead.systemPrompt);

    if (secondRead.systemPrompt === specialVal) {
        console.log("✅ SUCCESS: Settings persisted to Supabase DB.");
    } else {
        console.error("❌ FAIL: Settings did not persist.");
    }
}

testSettingsDB();
