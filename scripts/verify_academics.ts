import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
    console.log(`Checking database at: ${supabaseUrl}`);
    console.log("Attempting to query 'academic_papers'...");

    const { data, error } = await supabase
        .from('academic_papers')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Query Failed!");
        console.error(`Error Code: ${error.code}`);
        console.error(`Message: ${error.message}`);
        console.error(`Details: ${error.details}`);
        console.error(`Hint: ${error.hint}`);

        if (error.code === '42P01') { // Postgres code for undefined_table
            console.log("\nDEFINITION: Table 'academic_papers' does not exist.");
            console.log("ACTION: Please run the migration SQL in Supabase Dashboard.");
        }
    } else {
        console.log("✅ Table 'academic_papers' exists and is accessible.");
        console.log(`Rows returned: ${data?.length}`);
    }
}

verifyTable();
