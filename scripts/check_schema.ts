
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log("Checking Foreign Key Constraints...");

    // Query information_schema via RPC or raw query if possible?
    // User service role can't directly query info schema via client usually unless RPC.
    // But we can infer it by trying to fetch the relationship manually? 
    // No, we already know "books(*)" fails.

    // Let's try to add the constraint directly via migration, but as a test, 
    // we can try to "Create" a constraint via a raw SQL call if we had one.
    // Since we don't, we'll assume it's missing based on the behavior.

    // However, to be sure, let's verify if `books` table actually has the IDs we think.

    const { data: rooms } = await supabase.from('rooms').select('book_id').limit(1);
    // @ts-ignore
    const bookId = rooms?.[0]?.book_id;
    console.log("Sample Room Book ID:", bookId);

    if (bookId) {
        const { data: book } = await supabase.from('books').select('id').eq('id', bookId).single();
        console.log("Direct Fetch of Book by ID:", book);

        if (book) {
            console.log(">>> CONCLUSION: Data exists, IDs match. Join fails -> FK MISSING. <<<");
        } else {
            console.log(">>> CONCLUSION: Book with this ID does NOT exist. Data mismatch. <<<");
        }
    }
}

checkSchema();
