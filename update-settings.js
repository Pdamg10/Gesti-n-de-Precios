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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY not found in .env.local. Using Anon Key (might fail if RLS is strict).');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSettings() {
    console.log('--- Updating Pricing Settings ---');

    // New Default Adjustments
    // Cashea: 45% discount implies paying 55% of the price.
    // Transferencia: 55% discount implies paying 45% of the price.
    // Pago Movil: 300% increase implies paying 400% of the base price.
    const globalDefaults = {
        cashea: 55,       // Pay 55%
        transferencia: 45, // Pay 45%
        divisas: 100,     // Pay 100% (No discount/increase)
        custom: 100,      // Pay 100%
        pagoMovil: 400    // Pay 400% (Base + 300%)
    };

    // 1. Update Global Defaults
    const { error: errorDefaults } = await supabase
        .from('settings')
        .upsert({
            settingKey: 'default_adj_global',
            settingValue: JSON.stringify(globalDefaults)
        }, { onConflict: 'settingKey' });

    if (errorDefaults) {
        console.error('❌ Error updating default_adj_global:', errorDefaults.message);
    } else {
        console.log('✅ Global Defaults updated (Cashea 55%, Transf 45%, PM 400%)');
    }

    // 2. Update Price Columns Configuration
    // Ensure "pagoMovil" is set to Base: 'bs' and others correct.
    const newColumns = [
        { key: "cashea", label: "Cashea ($)", base: "usd", applyTax: false },
        { key: "transferencia", label: "Transferencia ($)", base: "usd", applyTax: false },
        { key: "divisas", label: "Divisas ($)", base: "usd", applyTax: false },
        { key: "custom", label: "Divisas en Fisico", base: "usd", applyTax: false },
        { key: "pagoMovil", label: "Pago Móvil (Bs)", base: "bs", applyTax: false }, // Changed to Bs base!
    ];

    const { error: errorColumns } = await supabase
        .from('settings')
        .upsert({
            settingKey: 'price_columns',
            settingValue: JSON.stringify(newColumns)
        }, { onConflict: 'settingKey' });

    if (errorColumns) {
        console.error('❌ Error updating price_columns:', errorColumns.message);
    } else {
        console.log('✅ Price Columns updated (Pago Movil set to Base Bs)');
    }

    console.log('\nDeployment completed! Please refresh the app.');
}

updateSettings();
