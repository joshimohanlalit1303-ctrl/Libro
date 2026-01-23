
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

async function testUpload() {
    console.log("Starting test upload of small file...");

    const fileName = `test_upload_${Date.now()}.txt`;
    const fileContent = "This is a test file to verify storage connectivity.";

    const { data, error } = await supabase
        .storage
        .from('books')
        .upload(fileName, fileContent, {
            contentType: 'text/plain',
            upsert: true
        });

    if (error) {
        console.error("X Test Upload Failed:", error);
    } else {
        console.log("-> Test Upload Success:", data);

        // Cleanup
        await supabase.storage.from('books').remove([fileName]);
        console.log("-> Test file cleaned up.");
    }
}

testUpload();
