import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { word } = await req.json();

        if (!word) {
            return NextResponse.json({ error: "No word provided" }, { status: 400 });
        }

        // Fetch from Free Dictionary API (No AI)
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

        if (!response.ok) {
            // Fallback for simple data if word not in dictionary
            const length = word.length;
            const rarity = length > 10 ? 'Gold' : length > 6 ? 'Silver' : 'Copper';
            return NextResponse.json({
                word: word,
                phonetic: "[Lexicon Searching]",
                essence: "A word found within the literary tapestry.",
                origin: "A unique linguistic signature.",
                synonyms: {
                    simple: "similar",
                    elegant: "evocative",
                    academic: "technical"
                },
                rarity: rarity
            });
        }

        const data = await response.json();
        const entry = data[0];

        // Map dictionary data to Alchemist structure
        const length = word.length;
        const rarity = length > 12 ? 'Gold' : length > 8 ? 'Silver' : 'Copper';

        const synonyms = entry.meanings[0]?.synonyms?.slice(0, 3) || [];

        return NextResponse.json({
            word: entry.word,
            phonetic: entry.phonetic || (entry.phonetics && entry.phonetics[0]?.text) || "",
            essence: entry.meanings[0]?.definitions[0]?.definition || "Meaning obscured by time.",
            origin: entry.origin || "Rooted in the ancient lexicons.",
            synonyms: {
                simple: synonyms[0] || "equivalent",
                elegant: synonyms[1] || "evocative",
                academic: synonyms[2] || "precise"
            },
            incantations: {
                sci_fi: `The protocol required the use of ${word}.`,
                fantasy: `The scroll spoke clearly of ${word}.`,
                mystery: `The clue lay hidden behind the ${word}.`
            },
            rarity: rarity
        });

    } catch (error: any) {
        console.error("Alchemy API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
