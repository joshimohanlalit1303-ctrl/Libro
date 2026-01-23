import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
    console.log("Verifying Bot Data...");

    // 1. Check Profiles
    const { count: botCount, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .textSearch('username', "'James_' | 'Sarah_' | 'Michael_' | 'Emily_'");

    console.log(`Bots in Profiles: ${botCount} (Expected ~21)`);

    // 2. Check Participants (Active)
    const { count: participantCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true });

    console.log(`Active Participants: ${participantCount}`);

    // 3. Check Reading Time greater than 0
    const { data: topReaders } = await supabase
        .from('profiles')
        .select('username, total_time_read')
        .order('total_time_read', { ascending: false })
        .limit(5);

    console.log("Top Readers (Time Check):");
    topReaders?.forEach(r => console.log(`- ${r.username}: ${r.total_time_read}s`));

    process.exit(0);
}

verify();
