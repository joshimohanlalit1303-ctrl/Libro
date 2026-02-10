
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
    console.log("=== DIAGNOSTIC REPORT ===");

    // 1. Vocabulary Check
    console.log("\n--- Vocabulary Stats ---");
    const { count: vaultCount, error: vaultError } = await supabase
        .from('vocabulary_vault')
        .select('*', { count: 'exact', head: true });

    if (vaultError) console.error("Vault Error:", vaultError.message);
    console.log(`Current 'vocabulary_vault' count: ${vaultCount}`);

    // Check old table just in case
    const { count: oldVocabCount } = await supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true });
    console.log(`Old 'vocabulary' table count: ${oldVocabCount}`);


    // 2. Rooms Check
    console.log("\n--- Bookathon Rooms ---");
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, description, configuration, created_at')
        .ilike('description', '%Bookathon%');

    if (roomsError) console.error("Rooms Error:", roomsError.message);

    if (rooms) {
        console.log(`Found ${rooms.length} rooms matching '%Bookathon%':`);
        rooms.forEach(r => {
            console.log(`- [${r.name}] Desc: "${r.description}" | Grads: ${(r.configuration as any)?.graduates || 0}`);
        });

        const totalGrads = rooms.reduce((acc, r) => acc + ((r.configuration as any)?.graduates || 0), 0);
        console.log(`Total Graduates calculated from found rooms: ${totalGrads}`);
        console.log(`Target Total Participants (from UI): 124`);
        console.log(`Difference: ${124 - totalGrads}`);
    }

    // 3. Completed Books Check
    console.log("\n--- Completed Books Inconsistency Check ---");
    const { data: inconsistentProgress, error: progError } = await supabase
        .from('user_progress')
        .select('id, user_id, book_id, progress_percentage, is_completed')
        .gte('progress_percentage', 100)
        .not('is_completed', 'is', true);

    if (progError) console.error("Progress Error:", progError.message);

    if (inconsistentProgress && inconsistentProgress.length > 0) {
        console.log(`FOUND ${inconsistentProgress.length} records with 100% progress but is_completed != true.`);
        console.log("Sample:", inconsistentProgress.slice(0, 3));
    } else {
        console.log("No inconsistent completion records found.");
    }

    console.log("\n=== END REPORT ===");
}

main().catch(console.error);
