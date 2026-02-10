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
    console.log("Checking for completed books with inconsistent state...");

    // Fetch rows where progress is 100 but is_completed is not true
    const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .gte('progress_percentage', 100)
        .not('is_completed', 'is', true);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    console.log(`Found ${data.length} records with 100% progress but is_completed != true.`);

    if (data.length > 0) {
        console.log("Sample records:", data.slice(0, 5));
    } else {
        console.log("No inconsistent records found. Checking total completed books...");
        const { count, error: countError } = await supabase
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('is_completed', true);

        if (countError) console.error(countError);
        console.log(`Total count of 'is_completed' = true: ${count}`);
    }
}

main().catch(console.error);
