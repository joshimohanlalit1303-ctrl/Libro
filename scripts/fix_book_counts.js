
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBookCounts() {
    console.log("Starting book count fix...");

    // 1. Get all profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, books_read_count');

    if (profileError) {
        console.error("Error fetching profiles:", profileError);
        return;
    }

    console.log(`Checking ${profiles.length} profiles...`);

    for (const profile of profiles) {
        // 2. Count actual completed books
        const { count, error: countError } = await supabase
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_completed', true);

        if (countError) {
            console.error(`Error counting for ${profile.username}:`, countError);
            continue;
        }

        const actualCount = count || 0;

        if (profile.books_read_count !== actualCount) {
            console.log(`[FIX] ${profile.username}: Profile says ${profile.books_read_count}, Actual is ${actualCount}. Updating...`);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ books_read_count: actualCount })
                .eq('id', profile.id);

            if (updateError) {
                console.error(`Failed to update ${profile.username}:`, updateError);
            } else {
                console.log(`Checked/Updated ${profile.username}: ${profile.books_read_count} -> ${actualCount}`);
            }
        } else {
            // console.log(`[OK] ${profile.username} is correct (${actualCount})`);
        }
    }
    console.log("Done.");
}

fixBookCounts();
