
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

async function getAllFiles(bucket) {
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
    if (error) return [];
    return data || [];
}

async function cleanupOrphans() {
    console.log("--- Cleaning Orphaned Files ---");

    // 1. Get all files
    const files = await getAllFiles('books');

    // 2. Get known files
    const { data: books } = await supabase.from('books').select('epub_url, cover_url');
    const knownFiles = new Set();
    books.forEach(b => {
        if (b.epub_url) knownFiles.add(b.epub_url.split('/books/')[1]);
        if (b.cover_url) knownFiles.add(b.cover_url.split('/books/')[1]);
    });

    // 3. Identify Orphans
    const orphans = files.filter(f => !knownFiles.has(f.name) && f.name !== '.emptyFolderPlaceholder')
        .map(f => f.name);

    console.log(`Found ${orphans.length} orphans.`);

    if (orphans.length > 0) {
        // Delete in chunks of 50
        const chunkSize = 50;
        for (let i = 0; i < orphans.length; i += chunkSize) {
            const chunk = orphans.slice(i, i + chunkSize);
            console.log(`Deleting chunk ${i / chunkSize + 1}... (${chunk.length} files)`);
            const { error } = await supabase.storage.from('books').remove(chunk);
            if (error) console.error("Error deleting chunk:", error);
        }
        console.log("Orphan cleanup complete.");
    } else {
        console.log("No orphans to clean.");
    }
}

cleanupOrphans();
