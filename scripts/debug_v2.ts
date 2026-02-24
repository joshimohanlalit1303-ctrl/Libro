
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== TARGETED DEBUG ===");

    // 1. Find User 'Lalit'
    // Try username or metadata
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', '%lalit%'); // Adjust if username is different

    if (!users || users.length === 0) {
        console.log("No user found with username like 'lalit'. Listing top 5 profiles...");
        const { data: profiles } = await supabase.from('profiles').select('username, id, books_read_count').limit(5);
        console.table(profiles);
        return;
    }

    const user = users[0];
    console.log(`User Found: ${user.username} (${user.id})`);
    console.log(`Profile 'books_read_count': ${user.books_read_count}`);

    // 2. Check User Progress for this user
    const { data: progress, error: progError } = await supabase
        .from('user_progress')
        .select('*, books(title)')
        .eq('user_id', user.id);

    console.log(`\nUser Progress Rows: ${progress?.length}`);
    if (progress) {
        progress.forEach(p => {
            console.log(`- Book: ${p.books?.title} | Progress: ${p.progress_percentage}% | Completed: ${p.is_completed}`);
        });
    }

    // 3. Count ALL completed rows in DB
    const { count } = await supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('is_completed', true);
    console.log(`\nTotal Global 'is_completed=true' rows: ${count}`);

    // 4. Create Missing Room Command Generator
    console.log("\n--- Missing Room Fix ---");
    // We'll generate the SQL/Command to insert the room
    const missingRoomData = {
        name: "Gateway to Wisdom", // Placeholder
        description: "Bookathon 2026 Archive",
        configuration: { graduates: 42 }
    };
    console.log(`To fix room, we will insert: ${JSON.stringify(missingRoomData)}`);

}

main().catch(console.error);
