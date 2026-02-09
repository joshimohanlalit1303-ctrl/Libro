import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface WordCard {
    id: string;
    word: string;
    essence: string;
    origin: string;
    rarity: string;
    synonyms: any;
    phonetic?: string;
    created_at: string;
}

const Grimoire: React.FC = () => {
    const { user } = useAuth();
    const [words, setWords] = useState<WordCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchVault = async () => {
            const { data, error } = await supabase
                .from('vocabulary_vault')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) setWords(data);
            setLoading(false);
        };
        fetchVault();
    }, [user]);

    if (loading) return <div style={{ opacity: 0.5, padding: 20 }}>Consulting the Grimoire...</div>;

    if (words.length === 0) {
        return (
            <div style={{
                padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.02)',
                borderRadius: 20, border: '1px dashed rgba(0,0,0,0.1)'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🧪</div>
                <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.8 }}>Your Grimoire is Empty</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Transmute difficult words while reading to begin your collection.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
            gap: '20px',
            padding: '10px 4px'
        }}>
            {words.map((w) => {
                const rarityColor = w.rarity === 'Gold' ? '#FFD700' : w.rarity === 'Silver' ? '#94a3b8' : '#b45309';
                return (
                    <div key={w.id} style={{
                        background: 'white', padding: '24px', borderRadius: '24px',
                        border: `1px solid ${rarityColor}33`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        position: 'relative', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', gap: 12,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'default'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                        }}>
                        {/* rarity badge */}
                        <div style={{
                            fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                            letterSpacing: '0.1em', color: rarityColor, marginBottom: -4
                        }}>
                            {w.rarity} Discovery
                        </div>

                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, fontStyle: 'italic', color: '#2c2a26' }}>
                            {w.word}
                        </h3>
                        {w.phonetic && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: -8, fontFamily: 'monospace' }}>
                                {w.phonetic}
                            </div>
                        )}

                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, opacity: 0.8 }}>
                            {w.essence}
                        </p>

                        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {Object.values(w.synonyms || {}).map((s: any, i) => (
                                <span key={i} style={{
                                    fontSize: '0.7rem', padding: '4px 8px', borderRadius: 8,
                                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)',
                                    opacity: 0.7
                                }}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Grimoire;
