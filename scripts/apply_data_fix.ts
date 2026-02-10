
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== APPLYING DATA FIXES VIA API ===");

    // 1. Fetch all progress >= 100% that is NOT completed
    const { data: progressList, error: fetchError } = await supabase
        .from('user_progress')
        .select('id, user_id, book_id, progress_percentage')
        .gte('progress_percentage', 100)
        .not('is_completed', 'is', true);

    if (fetchError) {
        console.error("Error fetching progress:", fetchError);
        return;
    }

    console.log(`Found ${progressList.length} records to fix.`);

    // 2. Fix them in batches
    for (const p of progressList) {
        const { error: updateError } = await supabase
            .from('user_progress')
            .update({ is_completed: true })
            .eq('id', p.id);

        if (updateError) {
            console.error(`Failed to update progress ${p.id}:`, updateError.message);
        } else {
            console.log(`Fixed progress for User ${p.user_id} / Book ${p.book_id}`);
        }
    }

    // 3. Sync Profile Counts (for ALL users found in progressList)
    const userIds = [...new Set(progressList.map(p => p.user_id))];
    console.log(`Syncing profile counts for ${userIds.length} users...`);

    for (const uid of userIds) {
        // Count actual completed
        const { count, error: countError } = await supabase
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('is_completed', true);

        if (!countError) {
            await supabase
                .from('profiles')
                .update({ books_read_count: count })
                .eq('id', uid);
            console.log(`Updated User ${uid} -> count ${count}`);
        }
    }

    console.log("=== FIX COMPLETE ===");
}

main().catch(console.error);
