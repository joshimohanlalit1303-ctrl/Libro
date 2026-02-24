const https = require('https');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("No GEMINI_API_KEY found in .env.local");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else {
                console.log("Available Models:");
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name}`);
                    }
                });
            }
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });
}).on('error', (e) => {
    console.error("Network Error:", e);
});
