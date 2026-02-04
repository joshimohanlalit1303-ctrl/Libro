import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSetup() {
    console.log("Checking 'public_keys' table...");
    const { error: keyError } = await supabase.from('public_keys').select('count').limit(1);

    if (keyError) {
        if (keyError.code === '42P01') {
            console.error("❌ Table 'public_keys' NOT FOUND. Migration missing.");
        } else {
            console.error("❌ Error accessing 'public_keys':", keyError.message);
        }
    } else {
        console.log("✅ Table 'public_keys' exists.");
    }

    console.log("\nChecking 'friendships' table...");
    const { error: friendError } = await supabase.from('friendships').select('count').limit(1);
    if (friendError) {
        if (friendError.code === '42P01') {
            console.error("❌ Table 'friendships' NOT FOUND. Migration missing.");
        } else {
            console.error("❌ Error accessing 'friendships':", friendError.message);
        }
    } else {
        console.log("✅ Table 'friendships' exists.");
    }
}

checkSetup();
