import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './Social.module.css'; // Will create specific styles

interface Profile {
    id: string;
    username: string;
    avatar_url: string;
}

export default function Directory() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [requestSent, setRequestSent] = useState<Record<string, boolean>>({});

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .ilike('username', `%${query}%`)
            .neq('id', user?.id || '') // Don't show self
            .limit(10);

        if (!error && data) {
            setResults(data);
        }
        setLoading(false);
    };

    const sendRequest = async (targetId: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('friendships')
            .insert({
                requester_id: user.id,
                addressee_id: targetId,
                status: 'pending'
            });

        if (!error) {
            setRequestSent(prev => ({ ...prev, [targetId]: true }));
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', marginBottom: 20 }}>
                Consult the Directory
            </h2>

            <form onSubmit={handleSearch} style={{ display: 'flex', marginBottom: 30 }}>
                <input
                    type="text"
                    placeholder="Search for a kindred spirit..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '12px 20px',
                        borderRadius: '4px 0 0 4px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--input-bg)',
                        color: 'var(--foreground)',
                        fontFamily: 'var(--font-serif)'
                    }}
                />
                <button
                    type="submit"
                    style={{
                        padding: '0 24px',
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0 4px 4px 0',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600
                    }}
                >
                    SEARCH
                </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                {results.map(profile => (
                    <div key={profile.id} style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-subtle)',
                        padding: 20,
                        textAlign: 'center',
                        boxShadow: 'var(--card-shadow)',
                        borderRadius: 2
                    }}>
                        <img
                            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                            style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: 10, border: '2px solid var(--border-subtle)' }}
                        />
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{profile.username}</div>

                        {requestSent[profile.id] ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}><i>Ink Drying...</i></div>
                        ) : (
                            <button
                                onClick={() => sendRequest(profile.id)}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    background: 'transparent',
                                    border: '1px solid var(--primary)',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    borderRadius: 4
                                }}
                            >
                                Send Letter
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {loading && <div style={{ textAlign: 'center', marginTop: 20, fontStyle: 'italic', color: 'var(--text-muted)' }}>Searching the archives...</div>}
        </div>
    );
}
