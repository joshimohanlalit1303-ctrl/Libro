
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
    console.log("=== RESTORING MISSING HISTORICAL ROOM ===");

    // 1. Find a suitable book (The White Tiger)
    const { data: books } = await supabase
        .from('books')
        .select('id, title, cover_url')
        .ilike('title', '%White Tiger%')
        .limit(1);

    let bookId, coverUrl;
    if (books && books.length > 0) {
        console.log(`Found book: ${books[0].title}`);
        bookId = books[0].id;
        coverUrl = books[0].cover_url;
    } else {
        console.log("Book 'The White Tiger' not found. Fetching any book as fallback...");
        const { data: anyBook } = await supabase.from('books').select('id, cover_url').limit(1).single();
        if (!anyBook) {
            console.error("No books found in DB. Cannot create room.");
            return;
        }
        bookId = anyBook.id;
        coverUrl = anyBook.cover_url;
    }

    // 2. Identify Host (Lalit)
    const { data: host } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', '%lalit%')
        .limit(1)
        .single();

    const hostId = host?.id;

    if (!hostId) {
        console.error("Host 'Lalit' not found.");
        return;
    }

    // 3. Insert Room
    const roomData = {
        name: "The White Tiger Den",
        description: "Bookathon 2026 Archive",
        book_id: bookId,
        owner_id: hostId,
        privacy: 'public',
        cover_url: coverUrl,
        configuration: { graduates: 42 },
        max_participants: 100,
        room_type: 'standard',
        access_code: 'ARCHIV'
    };

    const { data: newRoom, error } = await supabase
        .from('rooms')
        .insert(roomData)
        .select()
        .single();

    if (error) {
        console.error("Error creating room:", error);
    } else {
        console.log(`Successfully created room: ${newRoom.name} (${newRoom.id})`);
    }
}

main().catch(console.error);
