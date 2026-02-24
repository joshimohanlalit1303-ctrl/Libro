
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

async function getAllFiles(bucket, path = '') {
    let allFiles = [];
    // List logic for Supabase storage (limit is usually 100, might need pagination for 600+)
    // But we expect it to be smaller now?

    // We'll just fetch a large chunk. Supabase list API paging is offset based or limit.
    // Default limit is 100.

    const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
    if (error) {
        console.error("Error listing files:", error);
        return [];
    }

    if (!data) return [];

    for (const file of data) {
        if (file.id === null) {
            // It's a folder? Supabase returns metadata. 
            // Actually, looks checking for 'metadata' existence is better for files
        }
        allFiles.push(file);
    }
    return allFiles;
}

async function audit() {
    console.log("--- Auditing Storage Bucket 'books' ---");

    // 1. Get all files in bucket
    const files = await getAllFiles('books');
    console.log(`Total Files in Bucket: ${files.length}`);

    let totalSize = 0;
    files.forEach(f => totalSize += (f.metadata ? f.metadata.size : 0));
    console.log(`Total Bucket Size (Computed): ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    // 2. Get all known file paths from DB
    const { data: books } = await supabase.from('books').select('epub_url, cover_url');
    const knownFiles = new Set();

    books.forEach(b => {
        if (b.epub_url) {
            const epub = b.epub_url.split('/books/')[1];
            if (epub) knownFiles.add(epub);
        }
        if (b.cover_url) {
            const cover = b.cover_url.split('/books/')[1];
            if (cover) knownFiles.add(cover);
        }
    });

    console.log(`Total Known Files in DB: ${knownFiles.size}`);

    // 3. Find Orphans
    const orphans = files.filter(f => !knownFiles.has(f.name) && f.name !== '.emptyFolderPlaceholder');
    console.log(`Orphaned Files Found: ${orphans.length}`);

    if (orphans.length > 0) {
        let orphanSize = 0;
        orphans.forEach(f => orphanSize += (f.metadata ? f.metadata.size : 0));
        console.log(`Orphaned Size: ${(orphanSize / 1024 / 1024).toFixed(2)} MB`);

        console.log("\nSample Orphans:");
        orphans.slice(0, 5).forEach(f => console.log(` - ${f.name}`));
    }
}

audit();
