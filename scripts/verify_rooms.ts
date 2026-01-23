import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
    console.log("Verifying Created Rooms...");

    // 1. Get all rooms
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, name, owner_id, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Most Recent Rooms:");
    rooms?.forEach(r => {
        // @ts-ignore
        console.log(`- "${r.name}" (Owner: ${r.profiles?.username || r.owner_id})`);
    });

    // Count Total
    const { count } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
    console.log(`Total Rooms: ${count}`);
    process.exit(0);
}

verify();
