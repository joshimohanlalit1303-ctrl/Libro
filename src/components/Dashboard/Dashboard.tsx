"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './Dashboard.module.css';
import { CreateRoomModal } from './CreateRoomModal';
import { AddBookModal } from './AddBookModal';
// import { UploadModal } from './UploadModal';


import { useRouter } from 'next/navigation';
import { TopReaders } from './TopReaders';
import { IntentionModal } from './IntentionModal';
import { DailyQuote } from './DailyQuote';
import { Auth } from '../Auth/Auth'; // Moved Auth import here as per instruction
import { StreakWarning } from './StreakWarning';

export default function Dashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddBook, setShowAddBook] = useState(false);
    // const [showUploadModal, setShowUploadModal] = useState(false);

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

    useEffect(() => {
        if (!user) return;
        const fetchStreak = async () => {
            const { data } = await supabase.from('profiles').select('streak_count, last_active_date').eq('id', user.id).single();
            if (data) {
                setStreak(data.streak_count || 0);
                setLastActiveDate(data.last_active_date);
            }
        };
        fetchStreak();
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
                .select('*, participants(last_seen)') // Restore participants fetch
                .order('created_at', { ascending: false });

            // Fallback for missing column (Error 42703: undefined_column)
            if (error && error.code === '42703') {
                console.warn("Heartbeat column missing, fetching basic room info.");
                const retry = await supabase.from('rooms')
                    .select('*, participants(joined_at)')
                    .order('created_at', { ascending: false });
                data = retry.data;
            } else if (error) {
                console.error("Dashboard: Error fetching rooms:", error.message);
                // [FIX] Simple retry for network glitches
                if (error.message?.includes('Failed to fetch')) {
                    console.log("Retrying fetch in 2s...");
                    setTimeout(async () => {
                        const { data: retryData } = await supabase.from('rooms')
                            .select('*, participants(last_seen)')
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

    return (
        <div className={styles.container}>

            <header className={styles.header}>
                <div className={styles.logo}>Libro</div>

                <div className={`${styles.searchContainer} ${styles.desktopSearch}`}>
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.headerRight}>
                    {/* Streak Badge */}
                    <div className={styles.streakBadge}>
                        <span>🔥</span> {streak} <span className={styles.streakLabel}>Day Streak</span>
                    </div>

                    <div
                        className={styles.user}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.username || user?.email}`}
                            alt="avatar"
                            className={styles.avatar}
                        />
                        <span>{user?.user_metadata?.username || 'User'}</span>

                        {showProfileMenu && (
                            <div className={styles.profileMenu}>
                                <button onClick={() => router.push('/profile')} className={styles.menuItem}>
                                    My Profile
                                </button>
                                <button onClick={() => router.push('/leaderboard')} className={styles.menuItem}>
                                    Leaderboard
                                </button>
                                <button onClick={handleSignOut} className={styles.menuItemDestructive}>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header >

            <main className={styles.main}>
                <div className={styles.actiomBar}>
                    <h1>Available Rooms</h1>

                    {/* Mobile Search - Scrolls with content */}
                    <div className={styles.mobileSearch}>
                        <input
                            type="text"
                            placeholder="Search rooms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.actions}>
                        <form onSubmit={startJoinFlow} className={styles.joinForm}>
                            <input
                                type="text"
                                placeholder="Enter Code"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.replace(/\s/g, '').toUpperCase())}
                                className={styles.joinInput}
                                maxLength={6}
                            />
                            <button type="submit" className={styles.joinBtn} disabled={joining}>
                                {joining ? '...' : 'Join'}
                            </button>
                        </form>

                        {/* Upload Button Removed by User Request */}
                        {/* 
                        <button
                            className={styles.createBtn}
                            onClick={() => setShowUploadModal(true)}
                            style={{ backgroundColor: '#2563eb', marginRight: '8px' }}
                        >
                            Upload Books
                        </button> 
                        */}

                        <button className={styles.createBtn} onClick={startCreateFlow}>
                            + Create Room
                        </button>
                    </div>
                </div>

                <div className={styles.dashboardLayout}>
                    <div className={styles.mainColumn}>
                        <div className={styles.grid}>
                            {filteredRooms.map(room => {
                                // Calculate active participants
                                const now = new Date();
                                const activeParticipants = (room.participants || []).filter((p: any) => {
                                    if (p.last_seen) {
                                        const lastSeen = new Date(p.last_seen);
                                        // [FIX] Increase threshold to 2-3 mins to avoid flickering "Inactive"
                                        return (now.getTime() - lastSeen.getTime()) < 180000;
                                    }
                                    if (p.joined_at) {
                                        const joinedAt = new Date(p.joined_at);
                                        return (now.getTime() - joinedAt.getTime()) < 300000;
                                    }
                                    return false;
                                });

                                const count = activeParticipants.length;
                                const isActive = count > 0;

                                return (
                                    <div key={room.id} className={styles.card} onClick={() => router.push(`/room/${room.id}`)}>

                                        {user?.id === room.owner_id && (
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={(e) => handleDelete(e, room.id)}
                                                title="Delete Room"
                                            >
                                                ✕
                                            </button>
                                        )}

                                        {room.cover_url ? (
                                            <div style={{ width: '100%', height: 160, overflow: 'hidden', borderRadius: '20px 20px 0 0', marginBottom: 0, position: 'relative' }}>
                                                <img src={room.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />

                                                <div style={{
                                                    position: 'absolute', top: 12, right: 12,
                                                    background: isActive ? 'rgba(76, 175, 80, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                                                    color: 'white', padding: '4px 8px', borderRadius: 12,
                                                    fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)'
                                                }}>
                                                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className={styles.cardContent}>
                                            {!room.cover_url && (
                                                <div className={styles.cardHeader}>
                                                    <h3>{room.name}</h3>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {room.privacy === 'private' && <span className={styles.badge}>Private</span>}
                                                        <span className={isActive ? styles.activeBadge : styles.badge}>
                                                            {isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {room.cover_url && <h3 style={{ marginTop: 0 }}>{room.name}</h3>}

                                            <p className={styles.desc}>{room.description || "No description provided."}</p>

                                            <div className={styles.meta}>
                                                <span className={styles.peopleReading}>
                                                    {count === 1 ? '1 PERSON READING' : `${count} PEOPLE READING`}
                                                </span>
                                                <span className={styles.roomCodeBadge}>
                                                    {room.access_code ? `#${room.access_code}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredRooms.length === 0 && (
                                <div className={styles.empty}>
                                    <p>{searchQuery ? 'No rooms match your search.' : 'No active rooms found. Why not start one?'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.sidebarColumn}>
                        <TopReaders />
                        <DailyQuote />
                    </div>
                </div>
            </main >

            {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
            {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} onSuccess={() => alert('Book added!')} />}
            <StreakWarning lastActiveDate={lastActiveDate} streakCount={streak} />
            {showIntentionModal && (
                <IntentionModal
                    onConfirm={handleIntentionConfirmed}
                    onCancel={() => setShowIntentionModal(false)}
                />
            )}
            {/* {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />} */}

        </div >
    );
}
