import React, { useEffect, useState } from 'react';

interface DefinitionCardProps {
    word: string;
    rect: DOMRect;
    onClose: () => void;
}

interface DictionaryEntry {
    word: string;
    phonetic?: string;
    meanings: {
        partOfSpeech: string;
        definitions: {
            definition: string;
            example?: string;
        }[];
    }[];
}

export const DefinitionCard: React.FC<DefinitionCardProps> = ({ word, rect, onClose }) => {
    const [data, setData] = useState<DictionaryEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Position calculation
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        // Calculate position: Below or Above selection
        let top = rect.bottom + 10;
        let left = rect.left + rect.width / 2;

        const CARD_WIDTH = 300; // Match width in styles
        const CARD_HEIGHT = 300; // Approx max height
        const PADDING = 16;

        if (typeof window !== 'undefined') {
            // 1. Vertical Flip Check
            if (top + CARD_HEIGHT > window.innerHeight) {
                // If flipping up also goes off top, prefer bottom but clamp height?
                // For now, simple flip
                const spaceAbove = rect.top;
                if (spaceAbove > 200) {
                    top = rect.top - 10; // We will use 'bottom' in style or transform
                    // actually, if we set 'top', we need to subtract height.
                    // But height is dynamic. Better to anchor to bottom of viewport?
                    // Or just set 'bottom' property instead of 'top'?
                    // Let's stick to 'top' calculate.
                    // If we flip, 'top' should be rect.top - height. We don't know height effectively.
                    // Alternative: Use `bottom` style property.
                }
            }

            // [FIX] Horizontal Clamping
            // Center is 'left'.
            // Left edge = left - width/2
            // Right edge = left + width/2

            const halfWidth = CARD_WIDTH / 2;

            // Check Left Edge
            if (left - halfWidth < PADDING) {
                left = halfWidth + PADDING;
            }

            // Check Right Edge
            if (left + halfWidth > window.innerWidth - PADDING) {
                left = window.innerWidth - PADDING - halfWidth;
            }
        }

        // [FIX] Vertical Flip Logic improvement
        // If we are near bottom, we might want to render *above* the selection.
        const isNearBottom = typeof window !== 'undefined' && (rect.bottom + 350 > window.innerHeight);

        const styleObj: React.CSSProperties = {
            position: 'fixed',
            left: left,
            transform: 'translateX(-50%)',
            zIndex: 3001,
            width: CARD_WIDTH, // Enforce width for calcs
        };

        if (isNearBottom) {
            styleObj.bottom = window.innerHeight - rect.top + 10;
            styleObj.top = 'auto'; // Reset top
            // Origin for animation
            styleObj.transformOrigin = 'bottom center';
        } else {
            styleObj.top = rect.bottom + 10;
            styleObj.bottom = 'auto';
            styleObj.transformOrigin = 'top center';
        }

        setStyle(styleObj);
    }, [rect]);

    useEffect(() => {
        const fetchDefinition = async () => {
            try {
                // Strip punctuation
                const cleanWord = word.replace(/[^\w\s]|_/g, "").trim();
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
                if (!res.ok) throw new Error('Definition not found');
                const json = await res.json();
                setData(json[0]); // Take first result
            } catch (err) {
                setError('No definition found.');
            } finally {
                setLoading(false);
            }
        };

        if (word) fetchDefinition();
    }, [word]);

    return (
        <>
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 3000 }}
                onClick={onClose}
            />
            <div
                style={{
                    ...style,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)', // Safari
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    // width: '300px', // Handled in hook
                    maxHeight: '300px',
                    overflowY: 'auto',
                    animation: 'popIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-sans)',
                    // transformOrigin is set in hook
                }}
            >
                <style jsx>{`
                    @keyframes popIn {
                        from { opacity: 0; transform: translate(-50%, 10px) scale(0.95); }
                        to { opacity: 1; transform: translate(-50%, 0) scale(1); }
                    }
                    /* Scrollbar */
                    div::-webkit-scrollbar { width: 4px; }
                    div::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
                `}</style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                        {word}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999' }}
                    >
                        &times;
                    </button>
                </div>

                {loading && <div style={{ color: '#666', fontSize: 14 }}>Looking up...</div>}

                {error && <div style={{ color: '#8B0000', fontSize: 14 }}>{error}</div>}

                {data && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {data.phonetic && (
                            <div style={{ fontSize: 13, color: '#666', fontFamily: 'monospace' }}>
                                {data.phonetic}
                            </div>
                        )}

                        {data.meanings.slice(0, 2).map((m, i) => (
                            <div key={i}>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                    color: '#8B5A2B', marginBottom: 4, textTransform: 'uppercase'
                                }}>
                                    {m.partOfSpeech}
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                    {m.definitions.slice(0, 2).map((d, j) => (
                                        <li key={j} style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 4, color: '#333' }}>
                                            {d.definition}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
