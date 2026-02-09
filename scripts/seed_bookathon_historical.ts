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

const HISTORICAL_BOOKS = [
    {
        title: "Gitanjali",
        author: "Rabindranath Tagore",
        cover_url: "https://covers.openlibrary.org/b/isbn/9788129109033-L.jpg"
    },
    {
        title: "Midnight's Children",
        author: "Salman Rushdie",
        cover_url: "https://covers.openlibrary.org/b/isbn/9780143062325-L.jpg"
    },
    {
        title: "The God of Small Things",
        author: "Arundhati Roy",
        cover_url: "https://covers.openlibrary.org/b/isbn/9780006550686-L.jpg"
    },
    {
        title: "Train to Pakistan",
        author: "Khushwant Singh",
        cover_url: "https://covers.openlibrary.org/b/isbn/9780143065883-L.jpg"
    }
];

const HISTORICAL_ROOMS = [
    {
        name: "The Great Indian Classics",
        description: "Bookathon 2026 Archive",
        book_title: "Gitanjali",
        graduates: 42
    },
    {
        name: "Midnight Scholars",
        description: "Bookathon 2026 Archive",
        book_title: "Midnight's Children",
        graduates: 31
    },
    {
        name: "Alchemist's Circle",
        description: "Bookathon 2026 Archive",
        book_title: "The God of Small Things",
        graduates: 28
    },
    {
        name: "Poetry & Chai",
        description: "Bookathon 2026 Archive",
        book_title: "Train to Pakistan",
        graduates: 23
    }
];

async function seed() {
    console.log("🚀 Seeding Historical Bookathon Data...");

    // Get a fallback owner ID (the first admin or user)
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    const ownerId = users?.[0]?.id;
    if (!ownerId) {
        console.error("❌ No users found in profiles table to own rooms.");
        return;
    }

    for (const book of HISTORICAL_BOOKS) {
        const { data: existingBook } = await supabase
            .from('books')
            .select('id')
            .eq('title', book.title)
            .maybeSingle();

        let bookId = '';
        const epubUrl = `https://example.com/books/${book.title.replace(/\s+/g, '_')}.epub`;

        if (existingBook) {
            console.log(`ℹ️ Book exists: ${book.title}. Updating...`);
            const { data: updatedBook } = await supabase
                .from('books')
                .update({ author: book.author, cover_url: book.cover_url })
                .eq('id', existingBook.id)
                .select().single();
            bookId = updatedBook!.id;
        } else {
            console.log(`🆕 Creating book: ${book.title}`);
            const { data: newBook, error: bErr } = await supabase
                .from('books')
                .insert({ title: book.title, author: book.author, cover_url: book.cover_url, epub_url: epubUrl, page_count: 300 })
                .select().single();
            if (bErr) { console.error(bErr.message); continue; }
            bookId = newBook!.id;
        }

        const roomInfo = HISTORICAL_ROOMS.find(r => r.book_title === book.title);
        if (roomInfo) {
            const { data: existingRoom } = await supabase.from('rooms').select('id').eq('name', roomInfo.name).maybeSingle();

            const roomData = {
                name: roomInfo.name,
                description: roomInfo.description,
                book_id: bookId,
                epub_url: epubUrl,
                cover_url: book.cover_url,
                max_participants: 50,
                privacy: 'public',
                owner_id: ownerId,
                access_code: `ARCH${Math.floor(Math.random() * 1000)}`,
                room_type: 'standard',
                configuration: { graduates: roomInfo.graduates, is_historical: true }
            };

            if (existingRoom) {
                console.log(`ℹ️ Room exists: ${roomInfo.name}. Updating...`);
                await supabase.from('rooms').update(roomData).eq('id', existingRoom.id);
            } else {
                console.log(`🆕 Creating room: ${roomInfo.name}`);
                await supabase.from('rooms').insert(roomData);
            }
        }
    }

    console.log("🏁 Historical Seeding Complete!");
}

seed();
