const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabase } = require('./supabaseClient');

// Default Settings Structure
const defaultSettings = {
    geminiApiKey: '',
    systemPrompt: 'You are an expert HR assistant. Analyze the candidate based on CV and DISC results.',
    googleDriveId: '',
    googleSheetId: '',
    serviceAccountJson: '',
    aiProvider: 'gemini',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-3.5-turbo',
    wahaBaseUrl: '',
    wahaSessionId: 'default',
    hrPhoneNumber: '',
    wahaApiKey: '',
    divisions: ['IT', 'HR', 'Marketing', 'Finance', 'Operations']
};

// In-Memory Cache (since Netlify functions are ephemeral, this helps within a single execution, 
// but we mostly rely on DB. For standard servers, this reduces DB hits).
let settingsCache = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

// Read settings from Supabase (ID 1)
async function getSettings() {
    let dbSettings = {};

    try {
        // Try Cache first (simple optimization)
        if (settingsCache && (Date.now() - lastFetch < CACHE_TTL)) {
            dbSettings = settingsCache;
        } else {
            const { data, error } = await supabase
                .from('app_settings')
                .select('config')
                .eq('id', 1)
                .single();

            if (error) {
                // If table doesn't exist or row missing, warn but continue with defaults
                console.warn("Supabase Settings Fetch Error (using defaults):", error.message);
                dbSettings = {};
            } else if (data) {
                dbSettings = data.config || {};
                settingsCache = dbSettings;
                lastFetch = Date.now();
            }
        }
    } catch (e) {
        console.error("Unexpected error fetching settings:", e);
    }

    // Merge: Defaults -> DB Settings -> Env Vars (Highest Priority)
    const finalSettings = { ...defaultSettings, ...dbSettings };

    // --- Environment Variable Overrides ---
    if (process.env.GEMINI_API_KEY) finalSettings.geminiApiKey = process.env.GEMINI_API_KEY;
    if (process.env.WAHA_BASE_URL) finalSettings.wahaBaseUrl = process.env.WAHA_BASE_URL;
    if (process.env.WAHA_SESSION_ID) finalSettings.wahaSessionId = process.env.WAHA_SESSION_ID;
    if (process.env.WAHA_API_KEY) finalSettings.wahaApiKey = process.env.WAHA_API_KEY;
    if (process.env.SUPABASE_URL) finalSettings.supabaseUrl = process.env.SUPABASE_URL; // Info only

    return finalSettings;
}

// Update settings to Supabase (ID 1)
async function updateSettings(newValues) {
    try {
        // 1. Get current to merge (we need the DB version, excluding Env Vars overrides if possible,
        // but for simplicity we just read what we have and merge new values.)
        // Ideally we should perform a DB transaction or read-modify-write.
        // For now: Fetch DB directly to avoid baking in Env Vars into the DB.

        const { data: currentData } = await supabase
            .from('app_settings')
            .select('config')
            .eq('id', 1)
            .single();

        const currentConfig = currentData ? currentData.config : {};
        const updatedConfig = { ...currentConfig, ...newValues };

        // 2. Save back
        const { error } = await supabase
            .from('app_settings')
            .upsert({ id: 1, config: updatedConfig, updated_at: new Date() });

        if (error) {
            console.error("Supabase Settings Update Error:", error);
            return false;
        }

        // Invalidate cache
        settingsCache = null;
        return true;

    } catch (e) {
        console.error("Error updating settings:", e);
        return false;
    }
}

// Sync wrapper for startup (Not used much in serverless)
function ensureSettings() {
    // No-op for DB version
}

module.exports = {
    getSettings,
    updateSettings,
    ensureSettings
};
