
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyColumn() {
    console.log("Verifying 'room_type' column in 'rooms' table...");
    const { data, error } = await supabase.from('rooms').select('*').limit(1);

    if (error) {
        console.error("Error fetching room:", error);
        return;
    }

    if (data && data.length > 0) {
        const room = data[0];
        console.log("Room columns:", Object.keys(room));
        if ('room_type' in room) {
            console.log(">>> SUCCESS: 'room_type' column exists! <<<");
        } else {
            console.log(">>> ERROR: 'room_type' column MISSING! <<<");
        }
    } else {
        console.log("No rooms found to check columns.");
    }
}

verifyColumn();
