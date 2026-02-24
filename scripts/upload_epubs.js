
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
// const EPub = require('epubjs'); // epubjs is browser focused, might be hard to use in node without dom shim. 
// Let's try a simpler approach or use a node-specific lib if available, or just filename parsing first.
// Actually package.json has "epubjs": "^0.3.93". Let's see if we can use it or just fall back to filename for now to be safe.
// Checking previous scripts, none use epubjs for parsing.
// Let's rely on filename for Title - Author.epub format or just Title.epub

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase keys. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

async function uploadEpubs() {
    console.log(`Scanning ${UPLOADS_DIR} for .epub files...`);

    if (!fs.existsSync(UPLOADS_DIR)) {
        console.error(`Uploads directory not found: ${UPLOADS_DIR}`);
        return;
    }

    const files = fs.readdirSync(UPLOADS_DIR).filter(file => file.toLowerCase().endsWith('.epub'));

    if (files.length === 0) {
        console.log("No .epub files found to upload.");
        return;
    }

    console.log(`Found ${files.length} epub(s). Starting upload process...`);

    for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const fileName = file;

        // Simple metadata extraction from filename
        // Assumes "Title - Author.epub" or just "Title.epub"
        let title = fileName.replace('.epub', '');
        let author = 'Unknown Author';

        if (title.includes(' - ')) {
            const parts = title.split(' - ');
            title = parts[0].trim();
            author = parts[1].trim();
        }

        console.log(`Processing: ${file}`);
        console.log(`  -> Title: ${title}`);
        console.log(`  -> Author: ${author}`);

        try {
            const fileBuffer = fs.readFileSync(filePath);

            // 1. Upload to Storage
            // Using a timestamp to avoid collisions
            const storagePath = `public/${Date.now()}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;

            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('books')
                .upload(storagePath, fileBuffer, {
                    contentType: 'application/epub+zip',
                    upsert: false
                });

            if (uploadError) {
                console.error(`  X Upload failed: ${uploadError.message}`);
                continue;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from('books')
                .getPublicUrl(storagePath);

            console.log(`  -> Uploaded to: ${publicUrl}`);

            // 3. Insert into Database
            const { data: insertData, error: insertError } = await supabase
                .from('books')
                .insert({
                    title: title,
                    author: author,
                    epub_url: publicUrl,
                    // uploaded_by: ??? // Since this is a script, maybe we can leave it null or assign to a specific admin user UUID if known.
                    // For now, leaving it null or letting database default handle it if nullable. 
                    // Schema says uploaded_by UUID REFERENCES auth.users(id), implies it can be null? 
                    // Let's check schema carefully. 'uploaded_by UUID REFERENCES auth.users(id)' is nullable by default.
                })
                .select()
                .single();

            if (insertError) {
                console.error(`  X Database insert failed: ${insertError.message}`);
                // Optional: Delete the file from storage if DB insert fails to keep clean state?
            } else {
                console.log(`  -> Database record created: ${insertData.id}`);

                // Optional: Move file to a 'processed' folder?
                // fs.renameSync(filePath, path.join(UPLOADS_DIR, 'processed', file));
            }

        } catch (e) {
            console.error(`  X Unexpected error: ${e.message}`);
        }
        console.log("---");
    }
}

uploadEpubs();
