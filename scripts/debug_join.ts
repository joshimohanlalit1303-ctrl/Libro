
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== DEBUGGING JOIN ===");

    // 1. Get User ID
    const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'joshimohanlalit1303@gmail.com')
        .single();

    if (!user) { console.error("User not found"); return; }
    console.log(`User ID: ${user.id}`);

    // 2. Try Simple Select (No Join)
    const { data: simple, error: simpleError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', true);

    if (simpleError) console.error("Simple Select Error:", simpleError);
    console.log(`Simple Select Count: ${simple?.length}`);

    // 3. Try Join
    const { data: joined, error: joinedError } = await supabase
        .from('user_progress')
        .select('*, books(title)')
        .eq('user_id', user.id)
        .eq('is_completed', true);

    if (joinedError) {
        console.error("Join Select Error:", joinedError);
    } else {
        console.log(`Join Select Count: ${joined?.length}`);
        joined?.forEach(j => console.log(`- Book Title: ${j.books?.title}`));
    }
}

main().catch(console.error);
