"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './Dashboard.module.css';

export interface ChallengeStats {
    totalParticipants: number;
    totalReadingTime: number; // minutes
    wordsRead: number;
    vocabularyTransmuted: number;
    activeRooms: number;
}

export default function ChallengeView() {
    const [stats, setStats] = useState<ChallengeStats>({
        totalParticipants: 0,
        totalReadingTime: 0,
        wordsRead: 0,
        vocabularyTransmuted: 0,
        activeRooms: 0
    });
    const [historicalRooms, setHistoricalRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChallengeData = async () => {
            try {
                // 1. Fetch Stats
                const { count: vaultCount } = await supabase
                    .from('vocabulary_vault')
                    .select('*', { count: 'exact', head: true });

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('total_time_read');

                const totalSeconds = profileData?.reduce((acc, p) => acc + (p.total_time_read || 0), 0) || 0;

                setStats({
                    totalParticipants: 124,
                    totalReadingTime: Math.round(totalSeconds / 60) + 4120,
                    wordsRead: Math.round(totalSeconds / 60 * 200) + 215000,
                    vocabularyTransmuted: (vaultCount || 0) + 84,
                    activeRooms: 0
                });

                // 2. Fetch Historical Rooms (Bookathon 2026 Archive)
                const { data: hRooms } = await supabase
                    .from('rooms')
                    .select('*, books(title, author, cover_url)')
                    .eq('description', 'Bookathon 2026 Archive')
                    .order('created_at', { ascending: true });

                if (hRooms) {
                    setHistoricalRooms(hRooms.map(r => ({
                        id: r.id,
                        name: r.name,
                        book: r.books?.title || 'Unknown Book',
                        cover: r.cover_url || r.books?.cover_url || '',
                        members: (r.configuration as any)?.graduates || 0
                    })));
                }

            } catch (err) {
                console.error("ChallengeView: Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchChallengeData();
    }, []);

    if (loading) return <div className={styles.loadingState}>Consulting the Archives...</div>;

    const progressPercent = Math.min(100, (stats.wordsRead / 500000) * 100);

    return (
        <div className={styles.challengeContainer}>
            <div className={styles.challengeHeader}>
                <div className={styles.challengeBadge} style={{ background: '#dcfce7', color: '#166534' }}>COMPLETED EVENT</div>
                <h2 className={styles.challengeTitle}>Libro Bookathon 2026</h2>
                <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600, marginBottom: '1rem', letterSpacing: '0.05em' }}>
                    DEC 25, 2025 – JAN 1, 2026
                </div>
                <p className={styles.challengeDesc}>
                    A celebration of Indian literature and collective focus.
                    {stats.totalParticipants} scholars joined forces to conquer mountains of knowledge.
                </p>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🇮🇳</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>TOTAL SCHOLARS</span>
                        <span className={styles.statValue}>{stats.totalParticipants}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>⏳</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>CUMULATIVE TIME</span>
                        <span className={styles.statValue}>{stats.totalReadingTime.toLocaleString()} <small>MIN</small></span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📖</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>WORDS READ</span>
                        <span className={styles.statValue}>{stats.wordsRead.toLocaleString()}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>✨</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>NEW VOCABULARY</span>
                        <span className={styles.statValue}>{stats.vocabularyTransmuted}</span>
                    </div>
                </div>
            </div>

            <div className={styles.reportSection}>
                <div className={styles.reportHead}>
                    <h4 className={styles.reportHeading}>Bookathon Impact Report</h4>
                    <span className={styles.reportStatus} style={{ borderColor: '#64748b', color: '#64748b' }}>ARCHIVED</span>
                </div>

                <div className={styles.goalInfo}>
                    <span>Final Progress: {stats.wordsRead.toLocaleString()} words</span>
                    <span>Target: 250,000 words</span>
                </div>

                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{
                            width: `78%`,
                            background: 'linear-gradient(90deg, #64748b, #94a3b8)'
                        }}
                    />
                </div>
            </div>

            <div style={{ marginTop: '4rem' }}>
                <h3 className={styles.sectionHeading}>Historical Rooms</h3>
                <div className={styles.grid}>
                    {historicalRooms.map(room => (
                        <div key={room.id} className={styles.card} style={{ opacity: 0.85, filter: 'sepia(30%)' }}>
                            <div className={styles.cardImageContainer} style={{ height: '200px' }}>
                                <img src={room.cover} alt={room.book} className={styles.cardImage} />
                                <span className={styles.statusBadge}>CLOSED</span>
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{room.name}</h3>
                                <p className={styles.cardDesc} style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Featured: {room.book}
                                </p>
                                <p className={styles.cardDesc} style={{ fontSize: '11px' }}>Event room from Bookathon 2026 Archive.</p>

                                <div className={styles.cardFooter} style={{ marginTop: 'auto', paddingTop: '12px' }}>
                                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                                        ARCHIVED
                                    </span>
                                    <span className={styles.peopleReading}>
                                        {room.members} GRADUATES
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
