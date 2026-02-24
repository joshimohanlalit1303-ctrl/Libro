const https = require('https');

const url = "https://uxbxxbzdejjprvlswxil.supabase.co/storage/v1/object/public/books/1766268747875-15.epub";

https.get(url, (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers);

    const data = [];
    res.on('data', (chunk) => {
        data.push(chunk);
    });

    res.on('end', () => {
        const buffer = Buffer.concat(data);
        console.log("Total Size:", buffer.length);

        // Check for Zip Signature (PK..)
        if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
            console.log("✅ File has valid ZIP signature (PK..)");
        } else {
            console.log("❌ File missing ZIP signature. First bytes:", buffer.slice(0, 10));
        }
    });

}).on('error', (e) => {
    console.error("Error:", e);
});
