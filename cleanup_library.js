
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.warn("Could not read .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log("Cleaning up Library...");

    // 1. Delete all rows from lib_books
    // Note: This requires RLS to allow delete, or service role key. 
    // With anon key, this might fail if RLS is strict.
    console.log("Emptying 'lib_books' table...");
    const { error: dbError } = await supabase
        .from('lib_books')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (dbError) {
        console.error("DB Error (might need SQL editor to drop table):", dbError.message);
    } else {
        console.log("DB Table cleaned (rows deleted).");
    }

    // 2. Empty Storage Bucket 'books'
    console.log("Emptying 'books' storage bucket...");
    try {
        const { data: files, error: listError } = await supabase
            .storage
            .from('books')
            .list();

        if (listError) throw listError;

        if (files && files.length > 0) {
            const paths = files.map(f => f.name);
            const { error: removeError } = await supabase
                .storage
                .from('books')
                .remove(paths);

            if (removeError) throw removeError;
            console.log(`Removed ${files.length} files from 'books'.`);
        } else {
            console.log("Bucket already empty.");
        }
    } catch (e) {
        console.error("Storage Error:", e.message);
    }
}

cleanup();
