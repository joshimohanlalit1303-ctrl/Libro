"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '../../components/Dashboard/Dashboard.module.css'; // Reusing dashboard styles for consistency where possible

export default function LeaderboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .limit(50);

            if (error) {
                console.error("Error fetching leaderboard:", JSON.stringify(error, null, 2));
            } else {
                setLeaders(data || []);
            }
            setLoading(false);
        };

        fetchLeaderboard();
    }, []);

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                color: '#fff'
            }}>
                Loading Leaderboard...
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f172a',
            color: 'white',
            fontFamily: '-apple-system, system-ui, sans-serif'
        }}>
            <header className={styles.header} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div
                    className={styles.logo}
                    onClick={() => router.push('/dashboard')}
                    style={{ cursor: 'pointer' }}
                >
                    Libro
                </div>

                <div className={styles.headerRight}>
                    <div
                        className={styles.user}
                        onClick={() => router.push('/dashboard')}
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                        <span>← Back to Dashboard</span>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <h1 style={{
                        fontSize: 42,
                        fontWeight: 800,
                        background: 'linear-gradient(to right, #FFD700, #FFA500)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 10
                    }}>
                        Leaderboard
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: 18 }}>Top readers by books completed</p>
                </div>

                <div style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 24,
                    padding: 24,
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {leaders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            No data yet. Start reading to climb the leaderboard!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {leaders.map((leader, index) => {
                                const isTop3 = index < 3;
                                const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#64748b';

                                return (
                                    <div key={leader.user_id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px 24px',
                                        background: isTop3 ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                        borderRadius: 16,
                                        border: isTop3 ? `1px solid ${rankColor}40` : '1px solid transparent',
                                        transition: 'all 0.2s',
                                        cursor: 'default'
                                    }}>
                                        <div style={{
                                            width: 40,
                                            fontSize: 24,
                                            fontWeight: 800,
                                            color: rankColor,
                                            textAlign: 'center',
                                            marginRight: 20
                                        }}>
                                            {index + 1}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 16 }}>
                                            <div style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                border: `2px solid ${rankColor}`
                                            }}>
                                                <img
                                                    src={leader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username || 'user'}`}
                                                    alt={leader.username}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: 18, fontWeight: 600, color: user?.id === leader.user_id ? '#60a5fa' : 'white' }}>
                                                    {leader.username || 'Anonymous Reader'}
                                                    {user?.id === leader.user_id && <span style={{ fontSize: 12, marginLeft: 8, background: '#60a5fa20', color: '#60a5fa', padding: '2px 6px', borderRadius: 4 }}>YOU</span>}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{leader.books_read_count}</span>
                                            <span style={{ fontSize: 14, color: '#94a3b8', marginLeft: 6 }}>Books</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
