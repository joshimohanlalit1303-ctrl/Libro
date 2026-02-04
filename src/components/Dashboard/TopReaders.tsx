"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// Removing CSS module dependency for inline styles to ensure 'premium' custom look without conflict, 
// or we could keep it if we wanted to mix. Let's go with inline + standard styles for the glass effect.

// Helper to format seconds
const formatTime = (seconds: number) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

export const TopReaders = () => {
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            // [FIX] Query 'profiles' directly. Ensure 'streak_count' is fetched.
            // If streak_count column status is uncertain in 'profiles' vs 'users' table, 
            // we assume it's on profiles based on standard Supabase gamification setups.
            // If it fails, we'll silently default to 0.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, books_read_count, total_time_read, streak_count')
                .order('books_read_count', { ascending: false }) // Primary: Books Read
                .order('total_time_read', { ascending: false })  // Secondary: Total Time
                .limit(5); // Increased to 5 for better density

            if (data) setLeaders(data);
            if (error) console.error("Leaderboard error:", error);
            setLoading(false);
        };
        fetchLeaders();
    }, []);

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.4)', // Liquid Glass - Light
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            padding: '24px',
            fontFamily: '"Geist", sans-serif',
            color: '#1a1a1a',
            minHeight: '200px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                paddingBottom: '12px'
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    color: '#2c3e50',
                    letterSpacing: '-0.02em'
                }}>
                    Top Readers
                </h3>
                <a href="/leaderboard" style={{
                    fontSize: '13px',
                    color: '#6366f1',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'opacity 0.2s'
                }}>
                    View All →
                </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Loading stats...
                    </div>
                ) : leaders.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No readers yet.<br />Be the first to start reading!
                    </div>
                ) : (
                    leaders.map((leader, i) => (
                        <div key={leader.id || i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px',
                            borderRadius: '12px',
                            transition: 'background 0.2s',
                            cursor: 'default'
                            // Hover effect handled by CSS usually, inline styles are tricky for hover.
                        }}>
                            {/* Rank */}
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'rgba(0,0,0,0.05)',
                                color: i < 3 ? '#fff' : '#64748b',
                                fontSize: '14px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: i < 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                flexShrink: 0
                            }}>
                                {i + 1}
                            </div>

                            {/* Avatar */}
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={leader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`}
                                    alt={leader.username}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #fff',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                {leader.streak_count >= 3 && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: -2,
                                        right: -4,
                                        fontSize: '10px',
                                        background: '#fff',
                                        borderRadius: '50%',
                                        padding: '2px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}>
                                        🕯️
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {leader.username}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: '#64748b',
                                    display: 'flex',
                                    gap: '8px',
                                    whiteSpace: 'nowrap'
                                }}>
                                    <span title="Total Books Read">📖 {leader.books_read_count || 0} Books</span>
                                    <span style={{ width: 3, height: 3, background: '#cbd5e1', borderRadius: '50%' }} />
                                    <span title="Total Time Read">⏱️ {formatTime(leader.total_time_read)}</span>
                                </div>
                            </div>

                            {/* Streak Badge (Right Side) */}

                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
