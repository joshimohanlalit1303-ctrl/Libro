import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: NextRequest) {
    try {
        const { word, context, bookTitle } = await req.json();

        if (!word) {
            return NextResponse.json({ error: "No word provided" }, { status: 400 });
        }

        const prompt = `
            LITERARY ALCHEMY:
            Transmute the word "${word}" found in the book "${bookTitle || 'Unknown'}".
            Context: "${context || 'Reading...'}"
            
            Return a JSON object with the following structure:
            {
                "phonetic": "The phonetic pronunciation (e.g., /ɪˈfɛmərəl/ or 'ee-fem-er-uhl')",
                "essence": "A simple, intuitive explanation for this context (1 sentence).",
                "origin": "A fascinating 1-sentence life story of the word (Etymology).",
                "synonyms": {
                    "simple": "common alternative",
                    "elegant": "evocative alternative",
                    "academic": "precise/technical alternative"
                },
                "incantations": {
                    "sci_fi": "A cool sci-fi sentence using the word.",
                    "fantasy": "A magical fantasy sentence using the word.",
                    "mystery": "A noir mystery sentence using the word."
                },
                "rarity": "Choose one: Copper (Common), Silver (Rare), Gold (Epic/Arcane)"
            }
            
            Respond ONLY with the raw JSON.
        `.trim();

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Transmute API Error:", data);
            return NextResponse.json({ error: "Alchemy failed." }, { status: 500 });
        }

        const transmutation = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
        return NextResponse.json(transmutation);

    } catch (error: any) {
        console.error("Transmutation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
