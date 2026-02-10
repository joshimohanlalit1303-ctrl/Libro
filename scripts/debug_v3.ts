
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== FINAL VERIFICATION ===");

    // 1. Vocabulary Check
    const { count: vaultCount } = await supabase
        .from('vocabulary_vault')
        .select('*', { count: 'exact', head: true });

    // UI adds 453 to this count
    const uiVocab = (vaultCount || 0) + 453;
    console.log(`Vocabulary Count (DB): ${vaultCount}`);
    console.log(`Vocabulary Count (UI): ${uiVocab} (Target: 461)`);

    // 2. Rooms Check
    const { data: rooms } = await supabase
        .from('rooms')
        .select('name, configuration')
        .ilike('description', '%Bookathon%');

    let totalGrads = 0;
    console.log("\nHistorical Rooms:");
    rooms?.forEach(r => {
        const grads = (r.configuration as any)?.graduates || 0;
        console.log(`- ${r.name}: ${grads} graduates`);
        totalGrads += grads;
    });
    console.log(`Total Participants: ${totalGrads} (Target: 124)`);

    // 3. User Progress Check
    // Get user 'joshimohanlalit1303@gmail.com'
    const { data: user } = await supabase
        .from('profiles')
        .select('id, books_read_count')
        .eq('email', 'joshimohanlalit1303@gmail.com')
        .single();

    if (user) {
        console.log(`\nUser 'Lalit' Books Read Count: ${user.books_read_count}`);

        const { data: completed } = await supabase
            .from('user_progress')
            .select('book_id, is_completed, books(title)')
            .eq('user_id', user.id)
            .eq('is_completed', true);

        console.log(`Actual Completed Rows: ${completed?.length}`);
        completed?.forEach(c => console.log(`- ${c.books?.title} [OK]`));
    } else {
        console.log("\nUser 'Lalit' not found (check email).");
    }
}

main().catch(console.error);
