
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log("Checking Rooms and Linked Books...");

    // Fetch all rooms with their linked book data
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
            id,
            name,
            book_id,
            books (
                id,
                title,
                author
            )
        `)
        .limit(10);

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    console.log(`Found ${rooms.length} rooms.`);
    rooms.forEach(room => {
        console.log("--------------------------------------------------");
        console.log(`Room: ${room.name} (ID: ${room.id})`);
        console.log(`Linked Book ID: ${room.book_id}`);
        // @ts-ignore
        if (room.books) {
            // @ts-ignore
            console.log(`Book Title: ${room.books.title}`);
            // @ts-ignore
            console.log(`Book Author: ${room.books.author}`);
        } else {
            console.log("Book Data: NULL (Join failed or no book linked)");
        }
    });

    console.log("\nChecking Books Table Directly...");
    const { data: books, error: bookError } = await supabase.from('books').select('id, title').limit(5);
    if (books) {
        console.log(`Found ${books.length} books.`);
        books.forEach(b => console.log(`Book: ${b.title} (${b.id})`));
    } else {
        console.error("Error fetching books:", bookError);
    }
}

checkData();
