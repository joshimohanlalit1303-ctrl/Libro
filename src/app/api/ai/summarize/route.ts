import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: Request) {
    console.log("AI Route: Using API_URL:", API_URL); // [DEBUG] Verify model
    try {
        const { text, bookTitle, author } = await req.json();

        if (!text || text.length < 50) {
            return NextResponse.json({ error: "Text too short to summarize." }, { status: 400 });
        }

        // 1. Check for API Key
        if (!GEMINI_API_KEY) {
            console.log("AI: No API Key found. Returning simulated summary.");
            // Mock Response for "Simulated Mode"
            const mockSummary = `
**Chapter Insight (Simulated)**

*   **Key Event**: The protagonist discovers the hidden map inside the hollow book.
*   **Theme**: The struggle between knowledge and secrecy is central here.
*   **Character Note**: We see a shift in determination as the mystery unfolds.
            `.trim();

            // Artificial delay for realism
            await new Promise(r => setTimeout(r, 1500));
            return NextResponse.json({ summary: mockSummary, isSimulated: true });
        }

        // 2. Call Real AI (Google Gemini via REST)
        // Prompt Engineering
        const prompt = `
            You are a literary assistant. Summarize the following chapter text from the book "${bookTitle || 'Unknown'}" by ${author || 'Unknown'}.
            
            Keep it concise (max 3 bullet points).
            Focus on plot progression and emotional shifts.
            Format as Markdown.

            Text:
            "${text.substring(0, 12000)}" 
            (Truncated for safety)
        `;

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("AI API Error:", data);

            // [FIX] Graceful fallback for Rate Limits (429) OR Quota Exceeded (sometimes 403/400)
            const errorMessage = data.error?.message || "";
            if (response.status === 429 || errorMessage.toLowerCase().includes('quota')) {
                console.warn("AI: Rate limit/Quota exceeded. Falling back to simulated summary.");
                const fallbackSummary = `
**Chapter Insight (Offline Mode)**

*   **System Note**: Our AI scribes are currently overwhelmed (Rate Limit Reached).
*   **Action**: Please wait a minute while we restock our ink.
*   **Meanwhile**: Enjoy the silence of the library.

*(This is a temporary fallback due to high traffic.)*
                `.trim();
                return NextResponse.json({ summary: fallbackSummary, isSimulated: true });
            }

            throw new Error(errorMessage || "AI Request Failed");
        }

        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";

        return NextResponse.json({ summary, isSimulated: false });

    } catch (error: any) {
        console.error("Summarize Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
