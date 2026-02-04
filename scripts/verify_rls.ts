
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function verify() {
    console.log("Verifying Data Access...");

    // 1. Service Role Client (Bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminData } = await adminClient
        .from('rooms')
        .select('name, books(title, author)')
        .not('book_id', 'is', null) // Only check rooms with books
        .limit(1)
        .single();

    console.log("\n[Service Role] Admin Result:");
    console.log(JSON.stringify(adminData, null, 2));

    // 2. Anon Client (Respects RLS)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonData, error: anonError } = await anonClient
        .from('rooms')
        .select('name, books(title, author)')
        .not('book_id', 'is', null)
        .limit(1)
        .single();

    console.log("\n[Anon Key] Public Result:");
    if (anonError) console.error("Error:", anonError.message);
    else console.log(JSON.stringify(anonData, null, 2));

    if (adminData?.books && !anonData?.books) {
        console.log("\n>>> DIAGNOSIS: RLS BLOCKING DATA ACCESS <<<");
    } else if (!adminData?.books) {
        console.log("\n>>> DIAGNOSIS: BROKEN DATA LINK (Even Admin sees NULL) <<<");
    } else {
        console.log("\n>>> DIAGNOSIS: DATA ACCESSIBLE (Both see data) <<<");
    }
}

verify();
