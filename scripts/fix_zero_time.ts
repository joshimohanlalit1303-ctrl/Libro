
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars (need SUPABASE_SERVICE_ROLE_KEY for updates)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixZeroTime() {
    console.log("Finding profiles with books > 0 but time = 0...");

    // 1. Fetch anomalous profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, books_read_count, total_time_read')
        .gt('books_read_count', 0)
        .eq('total_time_read', 0);

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("No anomalies found.");
        return;
    }

    console.log(`Found ${profiles.length} profiles to fix:`);
    profiles.forEach(p => console.log(` - ${p.username}: ${p.books_read_count} books, 0s read`));

    // 2. Update them
    for (const p of profiles) {
        const estimatedTime = p.books_read_count * 3600; // 1 hour per book
        console.log(`Updating ${p.username} -> ${estimatedTime}s...`);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ total_time_read: estimatedTime })
            .eq('id', p.id);

        if (updateError) {
            console.error(`Failed to update ${p.username}:`, updateError);
        } else {
            console.log(`Updated ${p.username} successfully.`);
        }
    }
}

fixZeroTime();
