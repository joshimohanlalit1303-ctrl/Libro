
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== UPDATING BOOKATHON YEAR ===");

    // precise match
    const { count } = await supabase
        .from('rooms')
        .update({ description: 'Bookathon 2025 Archive' })
        .eq('description', 'Bookathon 2026 Archive')
        .select('*', { count: 'exact' });

    console.log(`Updated ${count} rooms.`);
}

main().catch(console.error);
