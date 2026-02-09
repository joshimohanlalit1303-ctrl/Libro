import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Highlight {
    id: string;
    text_content: string;
    color: string;
    book_id: string;
    created_at: string;
    books?: {
        title: string;
        author: string;
    };
}

const MyHighlights: React.FC = () => {
    const { user } = useAuth();
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchHighlights = async () => {
            const { data, error } = await supabase
                .from('highlights')
                .select(`
                    id, text_content, color, book_id, created_at,
                    books (title, author)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) setHighlights(data as any);
            setLoading(false);
        };
        fetchHighlights();
    }, [user]);

    if (loading) return <div style={{ opacity: 0.5, padding: 20 }}>Retrieving your annotations...</div>;

    if (highlights.length === 0) {
        return (
            <div style={{
                padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.02)',
                borderRadius: 20, border: '1px dashed rgba(0,0,0,0.1)', marginTop: 20
            }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🖋️</div>
                <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.8 }}>No Annotations Yet</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Highlight meaningful passages while reading to see them here.</p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: 40 }}>
            <h3 style={{
                fontSize: '12px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                paddingBottom: '8px'
            }}>
                Recent Annotations
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '16px'
            }}>
                {highlights.map((h) => (
                    <div key={h.id} style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        borderLeft: `4px solid ${h.color || '#fef3c7'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        transition: 'transform 0.2s',
                    }}>
                        <p style={{
                            margin: '0 0 12px 0',
                            fontSize: '15px',
                            lineHeight: '1.5',
                            fontStyle: 'italic',
                            color: 'var(--foreground)'
                        }}>
                            "{h.text_content}"
                        </p>
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>{h.books?.title} by {h.books?.author}</span>
                            <span>{new Date(h.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyHighlights;
