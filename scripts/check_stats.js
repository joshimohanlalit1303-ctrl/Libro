
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env 
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStats() {
    console.log("--- Storage Analysis ---");

    const { count: bookCount, error: bookError } = await supabase.from('books').select('*', { count: 'exact', head: true });
    const { count: roomCount, error: roomError } = await supabase.from('rooms').select('*', { count: 'exact', head: true });

    console.log(`Books in DB: ${bookCount || 0}`);
    console.log(`Rooms in DB: ${roomCount || 0}`);

    if (bookError) console.error("Book Error:", bookError.message);
    if (roomError) console.error("Room Error:", roomError.message);

    // List oldest 5 to show what might be deleted
    const { data: oldBooks } = await supabase.from('books').select('title, created_at').order('created_at', { ascending: true }).limit(5);
    if (oldBooks && oldBooks.length > 0) {
        console.log("\nOldest Books (Candidates for deletion):");
        oldBooks.forEach(b => console.log(`- ${b.title} (${b.created_at})`));
    }
}

checkStats();
