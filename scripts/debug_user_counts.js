
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

async function debugUser() {
    console.log("Searching for user 'Lalit'...");

    // 1. Find the user
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%Lalit%'); // Case insensitive search

    if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("No user found with name 'Lalit'");
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);

    for (const profile of profiles) {
        console.log(`\n--- Inspecting User: ${profile.username} (${profile.id}) ---`);
        console.log(`Profile 'books_read_count': ${profile.books_read_count}`);

        // 2. Count actual completed books in user_progress
        const { count, error: countError } = await supabase
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_completed', true);

        if (countError) {
            console.error("Error counting user_progress:", countError);
        } else {
            console.log(`Actual 'user_progress' count (is_completed=true): ${count}`);
        }

        // 3. List the books
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('book_id, is_completed, updated_at')
            .eq('user_id', profile.id)
            .eq('is_completed', true);

        if (progress) {
            console.log("Completed Books in user_progress:");
            progress.forEach(p => console.log(` - BookID: ${p.book_id}, Completed: ${p.is_completed}, At: ${p.updated_at}`));
        }
    }
}

debugUser();
