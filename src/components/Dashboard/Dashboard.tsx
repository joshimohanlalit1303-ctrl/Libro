"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './Dashboard.module.css';
import { CreateRoomModal } from './CreateRoomModal';
import { AddBookModal } from './AddBookModal';
import { LeaderboardModal } from './LeaderboardModal';


import { useRouter } from 'next/navigation';
// import { TopReaders } from './TopReaders'; // Removed V2
import { IntentionModal } from './IntentionModal';
// import { DailyQuote } from './DailyQuote'; // Removed V2
import { Auth } from '../Auth/Auth';
// import { StreakWarning } from './StreakWarning'; // Removed V2
import { CrypticMessage } from './CrypticMessage';
import { Fragments } from './Fragments';
import { CompleteProfile } from '../Auth/CompleteProfile';

export default function Dashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddBook, setShowAddBook] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // [PIVOT] Intention Flow State
    const [showIntentionModal, setShowIntentionModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<null | { type: 'create' } | { type: 'join', code?: string }>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);



    // [FIX] Hooks must be at top level
    const [streak, setStreak] = useState(0);
    const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [missingProfile, setMissingProfile] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchStreak = async () => {
            const { data, error } = await supabase.from('profiles').select('streak_count, last_active_date, avatar_url').eq('id', user.id).single();

            if (data) {
                // [FIX] Client-side validation
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
                setLastActiveDate(data.last_active_date);
                setAvatarUrl(data.avatar_url || '');
            } else if (error && error.code === 'PGRST116') {
                // PGRST116: JSON object requested, multiple (or no) rows returned
                // In .single() context, this means 0 rows.
                console.log("Dashboard: No profile found for user (PGRST116). Triggering completion.");
                setMissingProfile(true);
            } else if (error) {
                console.error("Dashboard: Error fetching profile:", error);
                // Do not set missingProfile(true) for random network errors
            }
        };
        fetchStreak();

        // Optional: Retry mechanism if profile fetch failed due to network?
        // For now, rely on user refresh or re-mount.
    }, [user]);

    // Filter Logic
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            room.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const isPublic = room.privacy === 'public';
        const isOwner = room.owner_id === user?.id; // Owners see their own private rooms
        return matchesSearch && (isPublic || isOwner);
    });

    const startJoinFlow = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setPendingAction({ type: 'join', code: joinCode });
        setShowIntentionModal(true);
    };

    const handleIntentionConfirmed = async (intention: string) => {
        setShowIntentionModal(false);

        // Save intention to session/local storage for the room to pick up? 
        // Or strictly strictly pass via URL param if possible? 
        // For MVP, let's store it in sessionStorage so we don't dirty URLs yet.
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('session_intention', intention);
        }

        if (pendingAction?.type === 'create') {
            setShowCreate(true);
        } else if (pendingAction?.type === 'join') {
            // Execute Join Logic
            setJoining(true);
            try {
                const code = pendingAction.code || joinCode;
                const { data, error } = await supabase.from('rooms').select('id').eq('access_code', code.trim().toUpperCase()).single();

                if (error || !data) {
                    alert("Invalid Room Code");
                } else {
                    router.push(`/room/${data.id}`);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setJoining(false);
            }
        }
        setPendingAction(null);
    };

    const startCreateFlow = () => {
        setPendingAction({ type: 'create' });
        setShowIntentionModal(true);
    };

    useEffect(() => {
        const fetchRooms = async () => {
            // Include participants last_seen for heartbeat calculation
            // If the migration hasn't run, this query might fail. We need a fallback.
            let { data, error } = await supabase.from('rooms')
                .select('*, participants(last_seen), books(page_count)') // Restore participants fetch + page_count
                .order('created_at', { ascending: false });

            // Fallback for missing column (Error 42703: undefined_column)
            if (error && error.code === '42703') {
                console.warn("Heartbeat column missing, fetching basic room info.");
                const retry = await supabase.from('rooms')
                    .select('*, participants(joined_at), books(page_count)')
                    .order('created_at', { ascending: false });
                data = retry.data;
            } else if (error) {
                console.error("Dashboard: Error fetching rooms:", error.message);
                // [FIX] Simple retry for network glitches
                if (error.message?.includes('Failed to fetch')) {
                    console.log("Retrying fetch in 2s...");
                    setTimeout(async () => {
                        const { data: retryData } = await supabase.from('rooms')
                            .select('*, participants(last_seen), books(page_count)')
                            .order('created_at', { ascending: false });
                        if (retryData) setRooms(retryData);
                    }, 2000);
                }
            }

            console.log("Dashboard: Fetched rooms", data?.length);
            if (data) setRooms(data);
        };
        fetchRooms();

        const channel = supabase.channel('public:rooms')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, payload => {
                const newRoom = { ...payload.new, participants: [] };
                setRooms(prev => [newRoom, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms' }, payload => {
                setRooms(prev => prev.filter(room => room.id !== payload.old.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
                fetchRooms();
            })
            .subscribe();



        // [FIX] Periodic refresh to ensure "Active" status and participant counts are fresh
        // This handles cases where Realtime might miss an event or connection drops
        const refreshInterval = setInterval(() => {
            fetchRooms();
        }, 30000); // 30 seconds

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.refresh();
    };

    const handleDelete = async (e: React.MouseEvent, roomId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this room? This cannot be undone.")) return;

        const { error } = await supabase.from('rooms').delete().eq('id', roomId);
        if (error) {
            console.error(error);
            alert("Failed to delete room: " + error.message);
        } else {
            setRooms(prev => prev.filter(r => r.id !== roomId));
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return <Auth />;





    // ... existing code ...

    // [PIVOT] Sanctuary V2 Layout

    // Calculate Presence
    const totalReaders = rooms.reduce((acc, room) => {
        // Simple heuristic: Count participants active in last 5 mins
        // Note: Real logic would need robust presence, but this is a start given our existing 'participants' data
        const active = (room.participants || []).filter((p: any) => {
            const lastSeen = p.last_seen ? new Date(p.last_seen).getTime() : 0;
            return (Date.now() - lastSeen) < 300000; // 5 mins
        }).length;
        return acc + active;
    }, 0);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo}>Libro</div>

                <div className={styles.headerRight}>
                    <div
                        className={styles.user}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        {/* Minimal Text Only Avatar for Sanctuary Vibe */}
                        <span style={{ fontSize: '14px', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                            {user?.user_metadata?.username || 'GUEST'}
                        </span>

                        {showProfileMenu && (
                            <div className={styles.profileMenu}>
                                <button onClick={() => router.push('/profile')} className={styles.menuItem}>
                                    Profile (Archetype)
                                </button>
                                <button onClick={handleSignOut} className={styles.menuItemDestructive}>
                                    Depart
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                {/* 1. Cryptic System Message */}
                <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <CrypticMessage />
                </div>

                {/* 2. Presence Indicator (Minimal) */}
                <div style={{ textAlign: 'center', marginBottom: '4rem', opacity: 0.6, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <span style={{ color: 'var(--primary)', marginRight: '8px' }}>●</span>
                    {totalReaders === 0 ? 'Silence in the library' : `${totalReaders} Silent Readers Active`}
                </div>

                {/* 3. Current Book / Last Read (Mocked for now, or pick first from history if available) */}
                {/* We'll use the first room joined as proxy for now, or just show "No active book" */}
                {/* TODO: Implement real 'lastRead' persistence */}

                <div className={styles.sectionHeader}>
                    <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', textTransform: 'none', letterSpacing: 'normal', color: 'var(--foreground)' }}>Available Rooms</h2>
                    <div className={styles.actions}>
                        <div className={styles.joinForm}>
                            <input
                                type="text"
                                placeholder="ENTER CODE"
                                className={styles.joinInput}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                            />
                            <button className={styles.joinBtn} onClick={startJoinFlow}>JOIN</button>
                        </div>
                        <button className={styles.createBtn} onClick={startCreateFlow}>
                            + CREATE ROOM
                        </button>
                    </div>
                </div>

                <div className={styles.dashboardLayout}>
                    <div className={styles.mainColumn}>
                        <div className={styles.grid}>
                            {filteredRooms.map(room => {
                                const now = new Date();
                                const activeCount = (room.participants || []).filter((p: any) => {
                                    if (p.last_seen) return (now.getTime() - new Date(p.last_seen).getTime()) < 180000;
                                    return false;
                                }).length;
                                const isActive = activeCount > 0;

                                return (
                                    <div key={room.id} className={styles.card} onClick={() => router.push(`/room/${room.id}`)}>
                                        <div className={styles.cardImageContainer}>
                                            {room.cover_url ? (
                                                <img src={room.cover_url} alt={room.name} className={styles.cardImage} />
                                            ) : (
                                                <div className={styles.cardImageFallback} style={{ backgroundColor: 'var(--surface-hover)' }}>
                                                    {/* Geometric Placeholder or similar */}
                                                </div>
                                            )}
                                            <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : ''}`}>
                                                {isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </div>

                                        <div className={styles.cardContent}>
                                            <h3 className={styles.cardTitle}>{room.name}</h3>
                                            <p className={styles.cardDesc}>{room.description || "Reading " + room.name}</p>

                                            <div className={styles.cardDivider} />

                                            <div className={styles.cardFooter}>
                                                <span className={styles.peopleReading}>
                                                    {activeCount} PEOPLE READING
                                                </span>
                                                <span className={styles.roomCode}>
                                                    #{room.access_code}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {filteredRooms.length === 0 && (
                            <div className={styles.empty}>
                                <p>The library is quiet.</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Area */}
                    <div className={styles.sidebarColumn}>
                        <div className={styles.sidebarCard}>
                            <div className={styles.sidebarHeader}>
                                <span>TOP READERS</span>
                                <span
                                    style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer' }}
                                    onClick={() => setShowLeaderboard(true)}
                                >
                                    View All
                                </span>
                            </div>
                            {/* Static Top Readers List for Visual Match - now with dynamic fallback */}
                            <div className={styles.readerItem}>
                                <div className={styles.readerRank}>1</div>
                                <div className={styles.readerAvatar}>
                                    <img
                                        src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.username || 'User'}`}
                                        alt="Me"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.username || 'User'}`;
                                        }}
                                    />
                                </div>
                                <div className={styles.readerInfo}>
                                    <div className={styles.readerName}>{user?.user_metadata?.username || 'Lalit'}</div>
                                    <div className={styles.readerStats}>{streak} Day Streak</div>
                                </div>
                            </div>
                            <div className={styles.readerItem}>
                                <div className={styles.readerRank}>2</div>
                                <div className={styles.readerAvatar}>
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Guest_05`}
                                        alt="Guest_05"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div className={styles.readerInfo}>
                                    <div className={styles.readerName}>Guest_05</div>
                                    <div className={styles.readerStats}>57m read</div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.sidebarCard}>
                            <h4 style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>DAILY INSPIRATION</h4>
                            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', lineHeight: '1.4', fontStyle: 'italic', color: 'var(--foreground)' }}>
                                "We read to know we are not alone."
                            </p>
                            <div style={{ textAlign: 'right', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>— C.S. Lewis</div>
                        </div>
                    </div>
                </div>

            </main>

            {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
            {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} onSuccess={() => alert('Book added!')} />}
            {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

            {showIntentionModal && (
                <IntentionModal
                    onConfirm={handleIntentionConfirmed}
                    onCancel={() => setShowIntentionModal(false)}
                />
            )}

            {missingProfile && <CompleteProfile />}
        </div>
    );
}
