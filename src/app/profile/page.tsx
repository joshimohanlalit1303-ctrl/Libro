"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/Footer';
import styles from './Profile.module.css';
import { BadgeGrid } from '@/components/Profile/BadgeGrid';
import { getArchetype, ARCHETYPE_DESCRIPTIONS } from '@/lib/archetypes';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [completedBooks, setCompletedBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [streak, setStreak] = useState(0);
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [isFoundingMember, setIsFoundingMember] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [booksReadCount, setBooksReadCount] = useState(0); // [NEW] Authoritative count
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user) return;
            try {
                // [NEW] Force check achievements on load to ensure Early Bird/Social Butterfly etc are awarded
                await supabase.rpc('check_achievements', { p_user_id: user.id });

                // Fetch Profile Stats
                const { data } = await supabase.from('profiles').select('username, streak_count, last_active_date, created_at, xp, level, total_time_read, avatar_url, books_read_count').eq('id', user.id).single();
                if (data) {
                    console.log("Profile Data:", data); // [DEBUG]

                    // [FIX] Client-side validation for Streak (Same as Dashboard)
                    let effectiveStreak = data.streak_count || 0;
                    if (data.last_active_date && effectiveStreak > 0) {
                        const now = new Date();
                        const yesterday = new Date(now);
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];
                        if (data.last_active_date < yesterdayStr) {
                            effectiveStreak = 0;
                        }
                    }
                    setStreak(effectiveStreak);

                    setXp(data.xp || 0);
                    setLevel(data.level || 1);
                    setTotalTime(data.total_time_read || 0);
                    // [FIX] Use authoritative book count
                    setBooksReadCount(data.books_read_count || 0);

                    // [FIX] Consolidate Avatar Seed: Use profile username first (same as leaderboard), fallback to metadata
                    const seed = data.username || user.user_metadata?.username || 'user';
                    setAvatarUrl(data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);

                    if (data.created_at) {
                        const joinedDate = new Date(data.created_at);
                        const cutoffDate = new Date('2026-01-01');
                        if (joinedDate < cutoffDate) {
                            setIsFoundingMember(true);
                        }
                    }
                }

                // Fetch Completed Books (using user_progress)
                // [FIX] Column name is likely 'is_completed' based on leaderboard view
                const { data: booksData, error: booksError } = await supabase
                    .from('user_progress')
                    .select('*, books(*)')
                    .eq('user_id', user.id)
                    .eq('is_completed', true);

                if (booksError) {
                    console.error("Error fetching completed books:", booksError);
                }

                if (booksData) {
                    setCompletedBooks(booksData);
                    // If the list is longer than the profile count (edge case), trust the list length
                    if (data && (data.books_read_count || 0) < booksData.length) {
                        setBooksReadCount(booksData.length);
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchProfileData();
        } else if (!authLoading) {
            // If no user and auth finished, stop loading (recursion redirect will handle it)
            setLoading(false);
        }
    }, [user, authLoading]);

    // ... (Completed Books fetch remains same)

    // ...

    if (authLoading || loading) {
        return (
            <div className={styles.container} style={{ justifyContent: 'center' }}>
                Loading Profile...
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo} onClick={() => router.push('/dashboard')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Libro
                </div>
            </header>

            <main className={styles.main}>
                {/* Hero Section */}
                <div className={styles.hero}>
                    <div className={styles.heroAvatar}>
                        <img
                            src={avatarUrl}
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div className={styles.heroContent}>
                        <h1 className={styles.username}>{user?.user_metadata?.username}</h1>

                        {/* [PIVOT] Archetype Display */}
                        <div style={{ marginTop: 16, marginBottom: 24, textAlign: 'center' }}>
                            <span style={{
                                display: 'inline-block',
                                fontFamily: 'var(--font-serif)',
                                fontSize: '2rem',
                                color: 'var(--primary)',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}>
                                {getArchetype({
                                    totalTime,
                                    booksRead: booksReadCount,
                                    roomsCreated: 0, // Need to pipe this through if available, or fetch
                                    streak
                                })}
                            </span>
                            <p style={{
                                fontFamily: 'var(--font-sans)',
                                color: 'var(--text-muted)',
                                fontSize: '0.9rem',
                                marginTop: 8,
                                fontStyle: 'italic',
                                opacity: 0.8
                            }}>
                                {ARCHETYPE_DESCRIPTIONS[getArchetype({
                                    totalTime,
                                    booksRead: booksReadCount,
                                    roomsCreated: 0,
                                    streak
                                })]}
                            </p>
                        </div>

                        {/* Minimal Stats (Secondary) */}
                        <div className={styles.statsRow} style={{ justifyContent: 'center', gap: 24, opacity: 0.6 }}>
                            <div title="Days in Sanctuary">
                                <span>🕯️</span> {streak}
                            </div>
                            <div title="Time Ditching Reality">
                                <span>⏳</span> {formatTimeShort(totalTime)}
                            </div>
                            <div title="Archives Collected">
                                <span>📜</span> {booksReadCount}
                            </div>
                        </div>
                    </div>
                </div>

                <section style={{ marginBottom: 40 }}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <span>🎖️</span> Achievements
                        </h2>
                    </div>
                    {user && <BadgeGrid userId={user.id} stats={{
                        createdAt: user.created_at, // Use auth user created_at as backup if profile missing
                        booksRead: booksReadCount
                    }} />}
                </section>

                <section>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <span>🏆</span> Completed Books
                            <span className={styles.countBadge}>{booksReadCount}</span>
                        </h2>
                    </div>

                    {completedBooks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📚</div>
                            <p className={styles.emptyText}>No books completed yet.</p>
                            <button onClick={() => router.push('/dashboard')} className={styles.primaryBtn}>
                                Browse Library
                            </button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {completedBooks.map((item) => {
                                const book = item.books;
                                return (
                                    <div key={item.books.id} className={styles.card}>
                                        <div className={styles.cardImage}>
                                            {book.cover_url ? (
                                                <img src={`/api/proxy?url=${encodeURIComponent(book.cover_url)}`} alt={book.title} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 24 }}>📖</div>
                                            )}
                                            <div className={styles.roomBadge} style={{ background: '#22c55e' }}>
                                                100%
                                            </div>
                                        </div>
                                        <div className={styles.cardContent}>
                                            <h3 className={styles.cardTitle}>{book.title}</h3>
                                            <p className={styles.cardSubtitle}>{book.author || 'Unknown Author'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section style={{ marginTop: 60 }}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <span>🏠</span> Created Rooms
                        </h2>
                    </div>

                    <CreatedRoomsList userId={user?.id} />
                </section>
            </main>
        </div>
    );
}

function CreatedRoomsList({ userId }: { userId: string | undefined }) {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;
        const fetchRooms = async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('owner_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching rooms:", error);
            } else {
                setRooms(data || []);
            }
            setLoading(false);
        };
        fetchRooms();
    }, [userId]);

    if (loading) return <div>Loading rooms...</div>;

    if (rooms.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏠</div>
                <p className={styles.emptyText}>You haven't created any rooms yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.grid}>
            {rooms.map((room) => (
                <div key={room.id}
                    onClick={() => router.push(`/room/${room.id}`)}
                    className={styles.card}
                >
                    <div className={`${styles.cardImage} ${styles.roomCardImage}`}>
                        {room.cover_url ? (
                            <img src={room.cover_url} alt={room.name} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📚</div>
                        )}
                        <div className={styles.roomBadge}>
                            {room.privacy === 'private' ? 'PRIVATE' : 'PUBLIC'}
                        </div>
                    </div>
                    <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>{room.name}</h3>
                        <p className={styles.cardSubtitle} style={{ marginBottom: 12 }}>
                            {room.description || 'No description'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
                            <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                {room.access_code}
                            </span>
                            <span>{new Date(room.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatTimeShort(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}
