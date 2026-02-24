
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);


// ... imports ...

async function cleanupStorage() {
    console.log("--- Starting Aggressive Storage Cleanup ---");

    // Aggressive Threshold: Keep only the 50 most recent books (approx < 200MB)
    const KEEP_COUNT = 50;

    // 1. Fetch from 'books' table (Primary source of truth for files now)
    // Note: If you haven't migrated completely, some might only be in 'rooms', 
    // but let's assume 'books' is the target or we fetch both.
    // Let's stick to 'rooms' for older data compatibility + 'books' table.
    // actually, let's just clean 'books' table which cascades? 
    // No, let's fetch 'books' first.

    const { data: books, error } = await supabase
        .from('books')
        .select('id, title, created_at, epub_url, cover_url')
        .order('created_at', { ascending: false });

    if (error) {
        // If 'books' table doesn't exist (migration not run?), try 'rooms'
        console.log("'books' table error (maybe missing?), trying 'rooms'...");
        return cleanupRoomsLegacy(KEEP_COUNT);
    }

    console.log(`Total Books Found: ${books.length}`);

    let booksToDelete = [];
    if (books.length > KEEP_COUNT) {
        booksToDelete = books.slice(KEEP_COUNT);
    } else {
        // If user explicitly said "delete epubs", maybe they want to delete ALL?
        // Let's stick to keeping recent 3 for safety unless told otherwise.
        if (books.length > 0 && process.argv.includes('--force-all')) {
            booksToDelete = books;
        } else {
            console.log(`Only ${books.length} books found. Deleting only if > ${KEEP_COUNT}.`);
            console.log("Run with --force-all to delete EVERYTHING.");
            // Proceed to cleanup orphaned files? 
            // Let's fall through to legacy room cleanup just in case.
        }
    }

    if (booksToDelete.length > 0) {
        console.log(`Deleting ${booksToDelete.length} books...`);
        for (const book of booksToDelete) {
            await deleteBookAndFiles(book);
        }
    }

    // Also clean up 'rooms' that might hold legacy files not in 'books'
    await cleanupRoomsLegacy(KEEP_COUNT);

    // [NEW] Orphaned File Cleanup (Aggressive)
    // List files in bucket, if not in Top 3 books, delete? 
    // Too risky to implement blindly without listing.
}

async function deleteBookAndFiles(record) {
    console.log(`\nDeleting: "${record.title || record.name}" (${record.id})`);

    const filesToDelete = [];
    const parseStoragePath = (url) => {
        if (!url) return null;
        // Regex to find 'books/...'
        const match = url.match(/\/books\/(.+)$/);
        if (match) return match[1];
        // Fallback for flat filenames
        if (!url.includes('/')) return url;
        return null;
    };

    if (record.epub_url) {
        const path = parseStoragePath(record.epub_url);
        if (path) filesToDelete.push(path);
    }
    if (record.cover_url) {
        const path = parseStoragePath(record.cover_url);
        if (path) filesToDelete.push(path);
    }

    if (filesToDelete.length > 0) {
        console.log(`   - Removing files: ${filesToDelete.join(', ')}`);
        const { error } = await supabase.storage.from('books').remove(filesToDelete);
        if (error) console.error("   - Storage error:", error.message);
    }

    // Delete DB Record
    const table = record.title ? 'books' : 'rooms'; // Heuristic
    const { error } = await supabase.from(table).delete().eq('id', record.id);
    if (error) console.error("   - DB error:", error.message);
    else console.log("   - Deleted from DB");
}

async function cleanupRoomsLegacy(keepCount) {
    console.log("\n--- Checking Legacy 'rooms' table ---");
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, name, created_at, epub_url, cover_url')
        .order('created_at', { ascending: false });

    if (error || !rooms) return;

    // Filter out rooms that are already "safe" (recent)
    // Actually, just delete older rooms.
    if (rooms.length <= keepCount) {
        console.log(`Legacy: Only ${rooms.length} rooms. Skipping.`);
        return;
    }

    const roomsToDelete = rooms.slice(keepCount);
    console.log(`Legacy: Deleting ${roomsToDelete.length} old rooms...`);

    for (const room of roomsToDelete) {
        await deleteBookAndFiles(room);
    }
}

cleanupStorage();
