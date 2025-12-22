const { createClient } = require('@supabase/supabase-js');

// Since I don't have the process.env keys here, I'll rely on the user having them in .env.local usually,
// but for a script I might need to read the file.
// Or I can just use a tool to grep them.
// Wait, I can't read .env.local directly usually safely if it's not committed, but I am in the user env.
// Let's try to read .env.local first to get keys.

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

async function checkRooms() {
    console.log("Checking rooms...");
    const { data, error } = await supabase.from('rooms').select('id, name, epub_url');

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    console.log(`Found ${data.length} rooms.`);

    for (const room of data) {
        console.log(`Room: ${room.name} (${room.id})`);
        console.log(`  epub_url: ${room.epub_url}`);

        if (room.epub_url) {
            try {
                // Check if URL is accessible
                const res = await fetch(room.epub_url, { method: 'HEAD' });
                console.log(`  Url Status: ${res.status} ${res.statusText}`);
            } catch (e) {
                console.log(`  Url Check Failed: ${e.message}`);
            }
        } else {
            console.log("  No epub_url!");
        }
        console.log("---");
    }
}

checkRooms();
