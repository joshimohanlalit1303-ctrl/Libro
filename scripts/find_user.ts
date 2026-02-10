
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== FIND USER BY EMAIL ===");

    // 1. List users with email like 'joshi'
    const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (error) {
        console.error("Auth Error:", error);
        return;
    }

    const targetUser = users.users.find(u => u.email?.includes('joshimohanlalit'));

    if (targetUser) {
        console.log(`Found User: ${targetUser.email} (${targetUser.id})`);

        // Check Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUser.id)
            .single();

        console.log("Profile:", profile);

        // Check Progress
        const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', targetUser.id);

        console.log(`Progress Rows: ${progress?.length}`);
        if (progress) {
            progress.forEach(p => {
                console.log(`- BookId: ${p.book_id} | Progress: ${p.progress_percentage}% | Completed: ${p.is_completed}`);
            });
        }
    } else {
        console.log("No user found with email containing 'joshi'.");
        console.log("Listing first 5 users:");
        users.users.slice(0, 5).forEach(u => console.log(`- ${u.email}`));
    }
}

main().catch(console.error);
