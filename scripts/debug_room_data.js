
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRoomData() {
    console.log("--- Checking Room Data ---");

    // Fetch a sample room (or all active rooms)
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
            id, 
            name, 
            book_id,
            books (
                id,
                title,
                author,
                cover_url
            )
        `)
        .limit(5);

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    rooms.forEach(room => {
        console.log(`Room: ${room.name} (${room.id})`);
        console.log(` - Book ID: ${room.book_id}`);
        if (room.books) {
            console.log(` - Book Title: ${room.books.title}`);
            console.log(` - Book Author: ${room.books.author}`);
        } else {
            console.log(" - Book Data: NULL (Relation query failed or no book)");
            // Try fetching book directly
            if (room.book_id) {
                console.log("   (Checking book table directly...)");
            }
        }
        console.log("---");
    });
}

checkRoomData();
