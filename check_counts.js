const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '.env.local');

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const lines = envConfig.split('\n');
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/"/g, '');
            if (key === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = val;
            if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = val;
        }
    });
} catch (e) {
    console.error("Could not read .env.local");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase keys");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkParticipants() {
    console.log("Checking rooms with participant counts...");
    // Attempt standard Supabase count syntax
    const { data, error } = await supabase
        .from('rooms')
        .select(`
            id,
            name,
            participants (count)
        `)
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkParticipants();
