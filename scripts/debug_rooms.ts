
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRooms() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, name, epub_url, book_id, room_type')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    console.log("Recent Rooms:");
    rooms.forEach(r => {
        console.log(`- Room: ${r.name} (${r.id})`);
        console.log(`  Type: ${r.room_type}`);
        console.log(`  URL: ${r.epub_url}`);
        console.log(`  Book ID: ${r.book_id}`);
    });
}

checkRooms();
