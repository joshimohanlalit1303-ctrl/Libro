const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing keys in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkView() {
    console.log("Checking if 'leaderboard' view exists...");

    // Attempt to select from the view
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error accessing 'leaderboard' view:");
        console.error(JSON.stringify(error, null, 2));
        if (error.code === '42P01') {
            console.log("\n-> This confirms the view does not exist. The migration needs to be run.");
        }
    } else {
        console.log("✅ 'leaderboard' view exists and is accessible.");
        console.log("Sample data:", data);
    }
}

checkView();
