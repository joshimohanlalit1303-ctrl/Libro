
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function repairLinks() {
    console.log("Starting Book Link Repair (Per-Room Query Mode)...");

    // 1. Fetch rooms
    const { data: rooms, error: roomError } = await supabase.from('rooms').select('id, name, book_id');
    if (!rooms || roomError) {
        console.error("Failed to fetch rooms:", roomError);
        return;
    }
    console.log(`Processing ${rooms.length} rooms...`);

    let updatedCount = 0;

    for (const room of rooms) {
        // Simple heuristic: Remove "Reading " prefix if present, else use full name
        const cleanName = room.name.replace(/^Reading\s+/i, '').trim();

        // Find matching book (Database Search)
        // Try strict match first, then ILIKE
        const { data: matches } = await supabase
            .from('books')
            .select('id, title')
            .ilike('title', cleanName)
            .limit(1);

        if (matches && matches.length > 0) {
            const match = matches[0];
            if (match.id !== room.book_id) {
                console.log(`Match found for room "${room.name}":`);
                console.log(`   -> Book: "${match.title}" (ID: ${match.id})`);
                console.log(`   -> Updating book_id from ${room.book_id} to ${match.id}`);

                const { error: updateError } = await supabase
                    .from('rooms')
                    .update({ book_id: match.id })
                    .eq('id', room.id);

                if (updateError) console.error("   [ERROR] Update failed:", updateError.message);
                else updatedCount++;
            } else {
                console.log(`Room "${room.name}" already linked correctly.`);
            }
        } else {
            // Only log failure if it looks like a real book title room
            if (cleanName.length > 5 && !cleanName.includes("Untitled")) {
                console.log(`No match found for room "${room.name}" (Clean: "${cleanName}")`);
            }
        }
    }

    console.log(`\nRepair Complete. Updated ${updatedCount} rooms.`);
}

repairLinks();
