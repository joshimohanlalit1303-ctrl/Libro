
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// import path from 'path';

// Load environment variables - simplistic
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.log('URL:', supabaseUrl);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDashboard() {
    console.log('Testing Dashboard Query (Decoupled)...');

    // 1. Fetch Rooms Only (Matches my fix)
    console.log("Running: supabase.from('rooms').select('*, participants(last_seen)')");
    const { data, error } = await supabase.from('rooms')
        .select('*, participants(last_seen)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('QUERY FAILED:', error.message);
    } else {
        console.log('QUERY SUCCESS!');
        console.log('Fetched rooms:', data?.length);
    }
}

debugDashboard();
