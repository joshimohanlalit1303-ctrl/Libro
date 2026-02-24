
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

async function checkBucket() {
    console.log("Checking 'books' bucket configuration...");

    // We can't directly select from storage.buckets via the JS client usually unless we use the RPC or raw query if enabled.
    // However, the service role key *might* give access to everything if we use the right schema.
    // Let's try to fetching the bucket details via the Storage API first.

    const { data: bucket, error } = await supabase
        .storage
        .getBucket('books');

    if (error) {
        console.error("Error getting bucket:", error);
    } else {
        console.log("Bucket Config (via API):", bucket);
    }

    // Also try to query the table directly if possible with service role
    // The table is in the 'storage' schema, which is not exposed by default to the 'public' API.
    // But since we are using Service Role, maybe?
    // Usually Supabase JS client defaults to 'public' schema.

    // Let's try RPC if available, or just rely on getBucket.
}

checkBucket();
