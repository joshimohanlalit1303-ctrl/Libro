import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: Request) {
    try {
        const { text, bookTitle, author, chapterTitle, isPageSummary } = await req.json();
        console.log(`AI Route: Starting request to ${API_URL} | Type: ${isPageSummary ? 'Page' : 'Chapter'}`);

        const hasText = text && text.trim().length > 100;

        // 1. Check for API Key
        if (!GEMINI_API_KEY) {
            console.warn("AI: No GEMINI_API_KEY found in environment.");
            // Mock Response for "Simulated Mode"
            const mockSummary = `
**Chapter Insight (Simulated)**

*   **Key Event**: Context provided for "${chapterTitle || 'Current Section'}".
*   **Theme**: The flow of the narrative in "${bookTitle || 'this book'}".
*   **Note**: Connects the current themes to the broader story arc.
            `.trim();

            await new Promise(r => setTimeout(r, 1000));
            return NextResponse.json({ summary: mockSummary, isSimulated: true });
        }

        // 2. Determine Prompt Strategy
        let prompt = "";
        const maxTextLen = isPageSummary ? 5000 : 12000; // Truncate more to save tokens/quota

        if (hasText) {
            prompt = `
                LITERARY DISTILLATION:
                Book: "${bookTitle || 'Unknown'}" | Author: ${author || 'Unknown'}
                Section: ${chapterTitle || 'Current Part'}
                Mode: ${isPageSummary ? 'Selective Extract' : 'Structural Summary'}
                
                Task: Provide a 1-sentence evocative overview and 3 punchy bullet points of key insights. 
                Use Markdown.
                
                Content:
                "${text.substring(0, maxTextLen)}" 
            `.trim();
        } else {
            prompt = `
                LITERARY CONTEXT (WORLD KNOWLEDGE):
                The reader is in "${bookTitle}" by ${author}, specifically "${chapterTitle}".
                Distill a 1-sentence contextual summary and 2 significance points based on your core knowledge of this work.
                Use Markdown.
            `.trim();
        }

        const callGemini = async (p: string) => {
            const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: p }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
                })
            });
            return res;
        };

        let response = await callGemini(prompt);
        let data = await response.json();

        // 3. Resilience Fallback: If 429/403 (Quota), try ONE lightweight Metadata fallback
        if (!response.ok && hasText) {
            const errorMessage = data.error?.message || "";
            if (response.status === 429 || errorMessage.toLowerCase().includes('quota') || response.status === 403) {
                console.log("AI: Rate Limited. Retrying with ultra-light Metadata prompt...");
                const litePrompt = `Summarize the significance of "${chapterTitle}" in "${bookTitle}" by ${author} in 2 sentences.`.trim();
                response = await callGemini(litePrompt);
                data = await response.json();
            }
        }

        if (!response.ok) {
            console.error("AI API Final Failure:", response.status, data);

            // Final Graceful Mock
            const fallbackSummary = `
**Scribe's Note (Temporary Offline)**

*   **Status**: Our AI assistant is currently on a quick tea break (High Traffic).
*   **Action**: This usually clears within 60 seconds.
*   **Tip**: Deep reading improves memory better than AI summaries anyway! 😉
            `.trim();
            return NextResponse.json({ summary: fallbackSummary, isSimulated: true });
        }

        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "The scribes were unable to distill this chapter.";
        return NextResponse.json({ summary, isSimulated: false });

    } catch (error: any) {
        console.error("Summarize Route Error:", error);
        return NextResponse.json({ error: `Server Error: ${error.message}. Target: ${API_URL}` }, { status: 500 });
    }
}
