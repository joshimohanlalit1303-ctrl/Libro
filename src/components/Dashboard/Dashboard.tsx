"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './Dashboard.module.css';
import { CreateRoomModal } from './CreateRoomModal';
import { AddBookModal } from './AddBookModal';
import Snowfall from '../Effects/Snowfall';

import { useRouter } from 'next/navigation';
import { Auth } from '../Auth/Auth';

export default function Dashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddBook, setShowAddBook] = useState(false);

    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);

    const [snowColor, setSnowColor] = useState("rgba(148, 163, 184, 0.5)"); // Default slate for light mode

    useEffect(() => {
        // Check system dark mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const updateSnowColor = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches) {
                setSnowColor("rgba(255, 255, 255, 0.95)"); // Bright White for Dark Mode
            } else {
                // Darker Blue-Grey for Light Mode (looks like snowflakes casting shadows)
                setSnowColor("rgba(95, 115, 140, 0.35)");
            }
        };

        // Initial check
        updateSnowColor(mediaQuery);

        // Listen for changes
        const listener = (e: MediaQueryListEvent) => updateSnowColor(e);
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, []);

    // [FIX] Hooks must be at top level
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchStreak = async () => {
            const { data } = await supabase.from('profiles').select('streak_count').eq('id', user.id).single();
            if (data) setStreak(data.streak_count || 0);
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

    const handleJoinByCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setJoining(true);

        try {
            const { data, error } = await supabase.from('rooms').select('id').eq('access_code', joinCode.trim().toUpperCase()).single();

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
                    .select('*, participants(joined_at)') // Fetch joined_at at least
                    .order('created_at', { ascending: false });
                data = retry.data;
            } else if (error) {
                console.error("Dashboard: Error fetching rooms", error);
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
            {/* Dynamic Snow Color based on Theme */}
            <Snowfall color={snowColor} />
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
                        <form onSubmit={handleJoinByCode} className={styles.joinForm}>
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

                        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
                            + Create Room
                        </button>
                    </div>
                </div>

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
            </main>

            {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
            {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} onSuccess={() => alert('Book added!')} />}

        </div >
    );
}
