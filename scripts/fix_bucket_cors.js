
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixCors() {
    console.log("Attempting to update 'books' bucket CORS settings...");

    // Try to update the bucket using the Storage API
    const { data, error } = await supabase
        .storage
        .updateBucket('books', {
            public: true,
            allowed_mime_types: null, // Allow all
            file_size_limit: 104857600, // Ensure limit is kept
            // allowed_origins: ['http://localhost:3000'] // valid property in updateBucket options?
        });

    // Note: JS SDK defines public, allowed_mime_types, file_size_limit. 
    // It does NOT explicitly list allowed_origins in some versions?
    // Let's check if we can pass it.

    if (error) {
        console.error("Error updating bucket:", error);
    } else {
        console.log("Bucket updated successfully:", data);
    }
}

fixCors();
