const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRooms() {
    console.log("Fetching one room to inspect columns...");

    // Select * to see all columns
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Room Columns Found:", Object.keys(data[0]));
        console.log("Sample Data:", data[0]);
    } else {
        console.log("No rooms found.");
    }
}

checkRooms();
