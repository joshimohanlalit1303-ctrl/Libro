
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkWhisperRooms() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, name, epub_url, book_id, room_type')
        .eq('room_type', 'whisper')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching whisper rooms:", error);
        return;
    }

    console.log("Recent Whisper Rooms:");
    if (rooms.length === 0) {
        console.log("No whisper rooms found.");
        return;
    }
    rooms.forEach(r => {
        console.log(`- Room: ${r.name} (${r.id})`);
        console.log(`  URL: ${r.epub_url}`);
        console.log(`  Book ID: ${r.book_id}`);
    });
}

checkWhisperRooms();
