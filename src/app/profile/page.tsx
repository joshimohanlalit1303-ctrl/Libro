"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/Footer';
import styles from './Profile.module.css';
import { XPBar } from '@/components/Profile/XPBar';
import { BadgeGrid } from '@/components/Profile/BadgeGrid';

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

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user) return;
            const { data } = await supabase.from('profiles').select('streak_count, created_at, xp, level, total_time_read').eq('id', user.id).single();
            if (data) {
                setStreak(data.streak_count || 0);
                setXp(data.xp || 0);
                setLevel(data.level || 1);
                setTotalTime(data.total_time_read || 0);

                if (data.created_at) {
                    const joinedDate = new Date(data.created_at);
                    const cutoffDate = new Date('2026-01-01');
                    if (joinedDate < cutoffDate) {
                        setIsFoundingMember(true);
                    }
                }
            }
        };
        if (user) fetchProfileData();
    }, [user]);

    useEffect(() => {
        const fetchCompletedBooks = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('user_progress')
                .select(`
                    progress_percentage,
                    last_read_at,
                    books (
                        id,
                        title,
                        cover_url,
                        author
                    )
                `)
                .eq('user_id', user.id)
                .eq('is_completed', true)
                .order('last_read_at', { ascending: false });

            if (error) {
                console.error("Error fetching completed books:", error);
            } else {
                setCompletedBooks(data || []);
            }
            setLoading(false);
        };

        if (user) {
            fetchCompletedBooks();
        }
    }, [user]);

    // Helper (can be shared utility but inline for now is fine)
    const formatTimeShort = (seconds: number) => {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

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
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.username || 'user'}`}
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div className={styles.heroContent}>
                        <h1 className={styles.username}>{user?.user_metadata?.username}</h1>
                        <div className={styles.statsRow}>
                            <div className={`${styles.badge} ${styles.streakBadge}`}>
                                <span>🔥</span> {streak} Day Streak
                            </div>
                            <div className={styles.badge} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <span>⏱️</span> {formatTimeShort(totalTime)} Read
                            </div>

                            {isFoundingMember && (
                                <div className={`${styles.badge} ${styles.foundingBadge}`} title="Joined before 2026">
                                    <span>🏛️</span> Founding Member
                                </div>
                            )}
                        </div>
                        <XPBar xp={xp} level={level} />
                    </div>
                </div>

                <section style={{ marginBottom: 40 }}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <span>🎖️</span> Achievements
                        </h2>
                    </div>
                    {user && <BadgeGrid userId={user.id} />}
                </section>

                <section>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <span>🏆</span> Completed Books
                            <span className={styles.countBadge}>{completedBooks.length}</span>
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
