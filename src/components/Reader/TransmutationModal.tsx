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
                const response = await fetch('/api/alchemy/transmute', {
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
        <div
            className="transmutation-overlay"
            style={{
                position: 'fixed', inset: 0, zIndex: 10000, // [FIX] High z-index to stay above Reader
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={(e) => {
                // [NEW] Close on backdrop click
                if ((e.target as HTMLElement).className === 'transmutation-overlay') {
                    onClose();
                }
            }}
        >
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes pulse { 0% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.6; transform: scale(1); } }
            `}</style>

            <div style={{
                width: '90%', maxWidth: 450, padding: '32px', borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                position: 'relative', overflow: 'hidden',
                textAlign: 'center', color: '#2c2a26',
                animation: 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}>
                {/* Alchemical Aura */}
                <div style={{
                    position: 'absolute', top: -50, left: -50, width: 150, height: 150,
                    background: rarityColor, filter: 'blur(60px)', opacity: 0.2, borderRadius: '50%'
                }} />

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)',
                        border: 'none', width: 32, height: 32, borderRadius: '50%',
                        fontSize: '1rem', cursor: 'pointer', opacity: 0.6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >✕</button>

                {loading ? (
                    <div style={{ padding: '40px 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>🧪</div>
                        <div style={{ fontWeight: 600, color: '#764ba2', fontSize: '1.2rem' }}>Transmuting...</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: 8, fontStyle: 'italic' }}>Distilling linguistic essence</div>
                    </div>
                ) : error ? (
                    <div style={{ color: '#F44336', padding: '20px 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
                        <p style={{ fontWeight: 600 }}>Alchemy Interrupted</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</p>
                        <button
                            onClick={onClose}
                            style={{
                                marginTop: 16, padding: '8px 24px', borderRadius: 99,
                                background: '#333', color: 'white', border: 'none', cursor: 'pointer'
                            }}
                        >
                            Return to Reality
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{
                            fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.25em',
                            color: rarityColor === '#CD7F32' ? '#a0522d' : rarityColor,
                            fontWeight: 900, marginBottom: 12
                        }}>
                            {data?.rarity} Discovery
                        </div>
                        <h2 style={{
                            fontSize: '2.4rem', margin: '0 0 8px', fontWeight: 800,
                            fontFamily: 'var(--font-serif)', color: '#1a1a1a'
                        }}>
                            {word}
                            <button
                                onClick={handleSpeak}
                                style={{
                                    background: 'rgba(0,0,0,0.05)', border: 'none', width: 44, height: 44,
                                    borderRadius: '50%', marginLeft: 16, cursor: 'pointer',
                                    transition: 'background 0.2s', fontSize: '1.4rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                title="Pronounce"
                            >
                                🔊
                            </button>
                        </h2>
                        {data?.phonetic && (
                            <div style={{
                                fontSize: '1.1rem', opacity: 0.5, marginBottom: 24,
                                fontFamily: 'monospace', letterSpacing: '0.05em'
                            }}>
                                {data.phonetic}
                            </div>
                        )}

                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <section style={{ borderLeft: `3px solid ${rarityColor}`, paddingLeft: 16 }}>
                                <div style={{ fontWeight: 900, fontSize: '0.7rem', opacity: 0.4, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>THE ESSENCE</div>
                                <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.6, color: '#333' }}>{data?.essence}</p>
                            </section>

                            <section style={{ opacity: 0.8 }}>
                                <div style={{ fontWeight: 900, fontSize: '0.7rem', opacity: 0.4, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>THE ORIGIN</div>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#5a544a', fontStyle: 'italic', lineHeight: 1.5 }}>{data?.origin}</p>
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {Object.entries(data?.synonyms || {}).map(([tier, syn]) => (
                                    <div key={tier} style={{
                                        padding: '10px 6px', borderRadius: 14, background: 'rgba(0,0,0,0.03)',
                                        border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{tier}</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{syn}</div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !userId}
                                style={{
                                    marginTop: 12, padding: '16px', borderRadius: 18,
                                    background: userId ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc',
                                    color: 'white', border: 'none', cursor: userId ? 'pointer' : 'not-allowed',
                                    fontWeight: 800, fontSize: '1.1rem',
                                    boxShadow: userId ? '0 10px 25px rgba(118, 75, 162, 0.4)' : 'none',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                                onMouseEnter={(e) => { if (userId) e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; }}
                                onMouseLeave={(e) => { if (userId) e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                            >
                                {saving ? '✨ Binding to Soul...' : '✨ Store in Grimoire'}
                            </button>
                            {!userId && <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center', marginTop: -15 }}>Sign in to capture words.</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TransmutationModal;
