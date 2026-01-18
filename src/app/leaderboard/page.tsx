"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '../../components/Dashboard/Dashboard.module.css'; // Reusing dashboard styles for consistency where possible

// Helper to format seconds
const formatTime = (seconds: number) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

export default function LeaderboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const { data, error } = await supabase
                .from('profiles') // Direct to profiles table
                .select('id, username, avatar_url, books_read_count, total_time_read')
                .order('total_time_read', { ascending: false })
                .order('books_read_count', { ascending: false })
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
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontFamily: '-apple-system, system-ui, sans-serif'
        }}>
            <header className={styles.header} style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--card-bg)', backdropFilter: 'blur(20px)' }}>
                <div
                    className={styles.logo}
                    onClick={() => router.push('/dashboard')}
                    style={{ cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                    Libro
                </div>

                <div className={styles.headerRight}>
                    <div
                        className={styles.user}
                        onClick={() => router.push('/dashboard')}
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}
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
                    <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Top readers by active reading time</p>
                </div>

                <div style={{
                    background: 'var(--card-bg)', // Uses variable
                    borderRadius: 24,
                    padding: 24,
                    border: '1px solid var(--card-border)',
                    boxShadow: 'var(--card-shadow)',
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
                                const currentUserId = user?.id; // safely access outside map if needed or use optional chaining

                                return (
                                    <div key={leader.id} style={{ // Use id from profiles
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px 24px',
                                        background: isTop3 ? 'var(--input-bg)' : 'transparent',
                                        borderRadius: 16,
                                        border: isTop3 ? `1px solid ${rankColor}40` : '1px solid transparent', // Keep rank color opacity
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
                                                <span style={{ fontSize: 18, fontWeight: 600, color: currentUserId === leader.id ? 'var(--primary, #60a5fa)' : 'var(--text-primary)' }}>
                                                    {leader.username || 'Anonymous Reader'}
                                                    {currentUserId === leader.id && <span style={{ fontSize: 12, marginLeft: 8, background: 'rgba(96, 165, 250, 0.1)', color: 'var(--primary, #60a5fa)', padding: '2px 6px', borderRadius: 4 }}>YOU</span>}
                                                </span>
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    {leader.books_read_count || 0} Books Completed
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{formatTime(leader.total_time_read)}</span>
                                            <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 6 }}>Read</span>
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
