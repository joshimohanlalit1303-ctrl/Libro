import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TransmutationData {
    essence: string;
    origin: string;
    synonyms: {
        simple: string;
        elegant: string;
        academic: string;
    };
    incantations: {
        sci_fi: string;
        fantasy: string;
        mystery: string;
    };
    rarity: string;
    phonetic?: string;
}

interface TransmutationModalProps {
    word: string;
    context: string;
    bookTitle: string;
    onClose: () => void;
    userId: string;
}

const TransmutationModal: React.FC<TransmutationModalProps> = ({ word, context, bookTitle, onClose, userId }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TransmutationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const transmute = async () => {
            try {
                const response = await fetch('/api/ai/transmute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word, context, bookTitle })
                });
                const result = await response.json();
                if (result.error) throw new Error(result.error);
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        transmute();
    }, [word, context, bookTitle]);

    const handleSave = async () => {
        if (!data || !userId) return;
        setSaving(true);
        try {
            const { error: saveError } = await supabase
                .from('vocabulary_vault')
                .upsert({
                    user_id: userId,
                    word,
                    essence: data.essence,
                    origin: data.origin,
                    synonyms: data.synonyms,
                    incantations: data.incantations,
                    rarity: data.rarity,
                    phonetic: data.phonetic,
                    book_context: context
                });
            if (saveError) throw saveError;
            onClose();
        } catch (err: any) {
            alert("Failed to save to Grimoire: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSpeak = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    const rarityColor = data?.rarity === 'Gold' ? '#FFD700' : data?.rarity === 'Silver' ? '#C0C0C0' : '#CD7F32';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                width: '90%', maxWidth: 450, padding: '32px', borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                position: 'relative', overflow: 'hidden',
                textAlign: 'center', color: '#2c2a26'
            }}>
                {/* Alchemical Aura */}
                <div style={{
                    position: 'absolute', top: -50, left: -50, width: 150, height: 150,
                    background: rarityColor, filter: 'blur(60px)', opacity: 0.15, borderRadius: '50%'
                }} />

                <button onClick={onClose} style={{
                    position: 'absolute', top: 20, right: 20, background: 'none', border: 'none',
                    fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5
                }}>✕</button>

                {loading ? (
                    <div style={{ padding: '40px 0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🧪</div>
                        <div style={{ fontWeight: 600, color: '#764ba2' }}>Transmuting...</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: 8 }}>Distilling linguistic essence</div>
                    </div>
                ) : error ? (
                    <div style={{ color: '#F44336' }}>
                        <div style={{ fontSize: '2rem' }}>⚠️</div>
                        <p>Alchemy Interrupted: {error}</p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em',
                            color: rarityColor, fontWeight: 800, marginBottom: 8
                        }}>
                            {data?.rarity} Discovery
                        </div>
                        <h2 style={{ fontSize: '2rem', margin: '0 0 4px', fontWeight: 700, fontStyle: 'italic' }}>
                            {word}
                            <button
                                onClick={handleSpeak}
                                style={{
                                    background: 'none', border: 'none', fontSize: '1.4rem',
                                    marginLeft: 12, cursor: 'pointer', opacity: 0.6
                                }}
                                title="Pronounce"
                            >
                                🔊
                            </button>
                        </h2>
                        {data?.phonetic && (
                            <div style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: 20, fontFamily: 'monospace' }}>
                                {data.phonetic}
                            </div>
                        )}

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <section>
                                <div style={{ fontWeight: 800, fontSize: '0.7rem', opacity: 0.5, marginBottom: 4 }}>THE ESSENCE</div>
                                <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>{data?.essence}</p>
                            </section>

                            <section>
                                <div style={{ fontWeight: 800, fontSize: '0.7rem', opacity: 0.5, marginBottom: 4 }}>THE ORIGIN</div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#5a544a', fontStyle: 'italic' }}>{data?.origin}</p>
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                {Object.entries(data?.synonyms || {}).map(([tier, syn]) => (
                                    <div key={tier} style={{
                                        padding: '8px', borderRadius: 12, background: 'rgba(0,0,0,0.03)',
                                        border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase' }}>{tier}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{syn}</div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    marginTop: 10, padding: '14px', borderRadius: 16,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white', border: 'none', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '1rem', boxShadow: '0 8px 16px rgba(118, 75, 162, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {saving ? 'Adding to Grimoire...' : '✨ Store in Grimoire'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TransmutationModal;
