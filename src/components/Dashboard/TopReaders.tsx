"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css'; // We'll reuse/extend dashboard styles

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

    useEffect(() => {
        const fetchLeaders = async () => {
            const { data } = await supabase
                .from('profiles') // Changed from 'leaderboard' view to 'profiles' table if view doesn't have time yet, OR update view. 
                // Let's assume we query profiles directly for now as 'leaderboard' view changes might be complex to deploy.
                // Actually, if 'leaderboard' is a view, it might be safer to just query 'profiles' which we added columns to.
                .select('id, username, avatar_url, books_read_count, total_time_read')
                .order('total_time_read', { ascending: false })
                .limit(3);

            if (data) setLeaders(data);
        };
        fetchLeaders();
    }, []);



    return (
        <div className={styles.topReadersCard}>
            <div className={styles.cardHeader}>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#888' }}>Top Readers</h3>
                <a href="/leaderboard" style={{ fontSize: 12, color: '#0071E3' }}>View All</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {leaders.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#888', fontSize: 13 }}>
                        No readers yet.<br />Be the first to start reading!
                    </div>
                ) : (
                    leaders.map((leader, i) => (
                        <div key={leader.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: '#333', color: '#fff', fontSize: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700
                            }}>
                                {i + 1}
                            </div>
                            <img
                                src={leader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`}
                                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{leader.username}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>
                                    {formatTime(leader.total_time_read)} read • {leader.books_read_count || 0} books
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
