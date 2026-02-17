const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_ADMIN_PASS = 'Chirica001*'; // Default from code
const DEFAULT_WORKER_PASS = 'Chirica001*'; // Default from code

async function seed() {
    console.log('--- Seeding Initial Data ---');

    const settingsToInsert = [
        { settingKey: 'admin_password', settingValue: DEFAULT_ADMIN_PASS },
        { settingKey: 'worker_password', settingValue: DEFAULT_WORKER_PASS },
        { settingKey: 'tax_rate', taxRate: 16 },
        { settingKey: 'exchange_rate', settingValue: '60' },
        // Default empty columns structure can be added if needed, but app handles defaults well.
    ];

    for (const setting of settingsToInsert) {
        const { data, error } = await supabase
            .from('settings')
            .upsert(setting, { onConflict: 'settingKey' })
            .select();

        if (error) {
            console.error(`❌ Error setting ${setting.settingKey}:`, error.message);
        } else {
            console.log(`✅ Set ${setting.settingKey} = ${setting.settingValue || setting.taxRate}`);
        }
    }

    console.log('\nSeed completed! You can now log in.');
}

seed();
