
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
    console.error("Error: Missing keys in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorage() {
    console.log("--- Checking Storage Stats ---");

    // 1. Count Books in DB
    const { count, error: countError } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error("DB Error:", countError.message);
    else console.log(`\n📚 Total Books in DB: ${count}`);

    // 2. Storage Size (Books Bucket)
    // List all files (default limit is 100, we might need more if not cleaned well, but let's try 1000)
    const { data: files, error: storageError } = await supabase.storage
        .from('books')
        .list('', { limit: 1000 });

    if (storageError) {
        console.error("Storage Error:", storageError.message);
        return;
    }

    let totalSizeBytes = 0;
    let fileCount = 0;

    files.forEach(file => {
        if (file.metadata && file.metadata.size) {
            totalSizeBytes += file.metadata.size;
        }
        fileCount++;
    });

    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

    console.log(`\n📦 Storage Bucket ('books'):`);
    console.log(`   - File Count: ${fileCount}`);
    console.log(`   - Total Size: ${totalSizeMB} MB`);
}

checkStorage();
