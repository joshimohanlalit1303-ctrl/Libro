
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn("Could not read .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHardcodedRoom() {
    const roomId = 'lib-9928-xqa';
    console.log(`Checking room ${roomId}...`);
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Room Found:", data);
    }
}

checkHardcodedRoom();
