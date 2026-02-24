import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local specifically
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countBooks() {
    console.log("Checking book count...");
    const { count, error } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error counting books:", error);
    } else {
        console.log(`Total books in database: ${count}`);
    }
}

countBooks();
