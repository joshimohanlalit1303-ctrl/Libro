
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("=== CHECKING BOOKATHON ROOMS ===");

    const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name, description')
        .ilike('description', '%Bookathon%');

    rooms?.forEach(r => {
        console.log(`[${r.id}] ${r.name} - ${r.description}`);
    });
}

main().catch(console.error);
