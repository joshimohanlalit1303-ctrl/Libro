const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually since we're not in Next.js runtime here
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) envVars[key.trim()] = val.trim().replace(/"/g, '');
        });
        return envVars;
    } catch (e) {
        console.error("Could not load .env.local via script. Please ensure it exists.");
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// NOTE: For deletion, we ideally need the SERVICE_ROLE_KEY if RLS policies block deletions.
// Users can export SUPABASE_SERVICE_ROLE_KEY before running this if needed.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing Supabase credentials. Make sure .env.local exists or vars are set.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function cleanupDuplicates() {
    console.log("Fetching all books...");
    const { data: books, error } = await supabase.from('books').select('*').order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching books:", error);
        return;
    }

    console.log(`Found ${books.length} books.`);

    // Group by Title
    const groups = {};
    books.forEach(book => {
        const key = book.title?.toLowerCase().trim();
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(book);
    });

    let deletedCount = 0;

    for (const title in groups) {
        const list = groups[title];
        if (list.length > 1) {
            console.log(`Found duplicate: "${title}" (${list.length} copies)`);

            // Keep the first one (oldest), delete the rest
            const toKeep = list[0];
            const toDelete = list.slice(1);

            for (const book of toDelete) {
                console.log(`  - Deleting ID: ${book.id} ...`);

                // 1. Delete Files
                if (book.epub_url) {
                    const path = extractPath(book.epub_url);
                    if (path) await deleteFile(path);
                }
                if (book.cover_url) {
                    const path = extractPath(book.cover_url);
                    if (path) await deleteFile(path);
                }

                // 2. Delete Row
                const { error: delError } = await supabase.from('books').delete().eq('id', book.id);
                if (delError) {
                    console.error(`    Failed to delete row: ${delError.message}`);
                } else {
                    console.log("    Row deleted.");
                    deletedCount++;
                }
            }
        }
    }

    console.log("--------------------------------");
    console.log(`Cleanup complete. Removed ${deletedCount} duplicate books.`);
}

function extractPath(url) {
    try {
        // Example: https://xyz.supabase.co/storage/v1/object/public/books/mybook.epub
        if (url.includes('/books/')) {
            const parts = url.split('/books/');
            return parts[1]; // "mybook.epub"
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function deleteFile(path) {
    const { error } = await supabase.storage.from('books').remove([path]);
    if (error) {
        console.error(`    Storage delete failed for ${path}:`, error.message);
    } else {
        console.log(`    File deleted: ${path}`);
    }
}

cleanupDuplicates();
