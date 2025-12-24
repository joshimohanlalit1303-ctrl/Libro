
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteSpecific() {
    const searchTerm = process.argv[2];
    if (!searchTerm) {
        console.error("Please provide a search term. Usage: node scripts/delete_specific.js 'Hamlet'");
        process.exit(1);
    }

    console.log(`--- Searching for "${searchTerm}" ---`);

    // 1. Search in Books
    const { data: books, error: bookError } = await supabase
        .from('books')
        .select('*')
        .ilike('title', `%${searchTerm}%`);

    // 2. Search in Rooms
    const { data: rooms, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .ilike('name', `%${searchTerm}%`);

    const items = [...(books || []), ...(rooms || [])];

    if (items.length === 0) {
        console.log("No matches found.");
        return;
    }

    console.log(`Found ${items.length} matches.`);

    // Helper to delete files
    const deleteFiles = async (url) => {
        if (!url) return;
        const match = url.match(/\/books\/(.+)$/);
        const path = match ? match[1] : (url.includes('/') ? null : url);
        if (path) {
            console.log(`   - Removing file: ${path}`);
            await supabase.storage.from('books').remove([path]);
        }
    };

    for (const item of items) {
        const name = item.title || item.name;
        console.log(`\nDeleting: "${name}" (${item.id})`);

        // Delete Files
        await deleteFiles(item.epub_url);
        await deleteFiles(item.cover_url);

        // Delete DB Record
        const table = item.title ? 'books' : 'rooms';
        const { error } = await supabase.from(table).delete().eq('id', item.id);

        if (error) console.error(`   - DB Error: ${error.message}`);
        else console.log(`   - Deleted from ${table}`);
    }
}

deleteSpecific();
