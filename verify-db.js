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
        const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
        env[key] = value;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing credentials in .env.local');
    process.exit(1);
}

console.log(`Checking connection to: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Check Settings (where passwords are stored in this app)
    console.log('\n--- Checking "settings" table (App Users) ---');
    const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('*');

    if (settingsError) {
        console.error('Error fetching settings:', settingsError.message);
    } else {
        console.log(`Found ${settings.length} settings:`);
        settings.forEach(s => {
            if (s.settingKey.includes('password')) {
                console.log(` - ${s.settingKey}: [HIDDEN] (Exists)`);
            } else {
                console.log(` - ${s.settingKey}: ${s.settingValue}`);
            }
        });

        const hasAdmin = settings.some(s => s.settingKey === 'admin_password');
        const hasWorker = settings.some(s => s.settingKey === 'worker_password');

        if (hasAdmin) console.log('✅ Admin user configured.');
        else console.log('⚠️ Admin password setting NOT found.');

        if (hasWorker) console.log('✅ Worker user configured.');
        else console.log('⚠️ Worker password setting NOT found.');
    }

    // Check generic Users table just in case
    console.log('\n--- Checking "users" table (if exists) ---');
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);

    if (usersError) {
        // Expected if table doesn't exist
        console.log('Note: "users" table query returned error (likely does not exist, which is normal for this app schema):', usersError.message);
    } else {
        console.log(`Found ${users.length} users in 'users' table.`);
    }
}

check();
