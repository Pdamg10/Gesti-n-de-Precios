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
// Use Service Role Key for writing
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY not found in .env.local. Using Anon Key (might fail).');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRate() {
    console.log('--- Updating Exchange Rate (BCV) ---');

    const EXCHANGE_RATE = '381.11'; // Tasa BCV 07/02/2026

    const { data, error } = await supabase
        .from('settings')
        .upsert({
            settingKey: 'exchange_rate',
            settingValue: EXCHANGE_RATE
        }, { onConflict: 'settingKey' })
        .select();

    if (error) {
        console.error('❌ Error updating exchange_rate:', error.message);
    } else {
        console.log(`✅ Exchange Rate updated to: ${EXCHANGE_RATE} Bs/$`);
    }
}

updateRate();
