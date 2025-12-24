"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './Dashboard.module.css';
import { CreateRoomModal } from './CreateRoomModal';
import { AddBookModal } from './AddBookModal';

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
                .select('*, participants(last_seen)')
                .order('created_at', { ascending: false });

            // Fallback for missing column (Error 42703: undefined_column)
            if (error && error.code === '42703') {
                console.warn("Heartbeat column missing, fetching basic room info.");
                const retry = await supabase.from('rooms')
                    .select('*, participants(joined_at)') // Fetch joined_at at least
                    .order('created_at', { ascending: false });
                data = retry.data;
            }

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

        // Update Streak
        const updateStreak = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Call the RPC function we created in migration
                // Note: The migration needs to be applied for this to work
                try {
                    await supabase.rpc('update_streak', { user_uuid: user.id });
                } catch (e) {
                    console.warn("Autosave streak failed (migration missing?)", e);
                }
            }
        };
        updateStreak();

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

                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.headerRight} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Streak Badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: '#FFF0E6', color: '#FF4500',
                        padding: '4px 10px', borderRadius: 20,
                        fontSize: 13, fontWeight: 700
                    }}>
                        <span>🔥</span> {streak}
                    </div>

                    <div
                        className={styles.user}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        style={{ position: 'relative', cursor: 'pointer' }}
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
                                <button onClick={handleSignOut} className={styles.menuItemDestructive}>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.actiomBar}>
                    <h1>Available Rooms</h1>

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
                        // Calculate active participants based on heartbeat (recent 1 minute) or recent join (fallback 5 mins)
                        const now = new Date();
                        const activeParticipants = (room.participants || []).filter((p: any) => {
                            // 1. Primary Heartbeat Check
                            if (p.last_seen) {
                                const lastSeen = new Date(p.last_seen);
                                return (now.getTime() - lastSeen.getTime()) < 60000; // 60s timeout
                            }
                            // 2. Fallback: Recently Joined (if heartbeat missing/not set yet)
                            if (p.joined_at) {
                                const joinedAt = new Date(p.joined_at);
                                return (now.getTime() - joinedAt.getTime()) < 300000; // 5 mins tolerance
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
                                    <div style={{ width: '100%', height: 160, overflow: 'hidden', borderRadius: '12px 12px 0 0', marginBottom: 12, position: 'relative' }}>
                                        <img src={room.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />

                                        <div style={{
                                            position: 'absolute', top: 8, right: 8,
                                            background: isActive ? 'rgba(76, 175, 80, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                                            color: 'white', padding: '4px 8px', borderRadius: 12,
                                            fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)'
                                        }}>
                                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.cardHeader}>
                                        <h3>{room.name}</h3>
                                        <div className={styles.badges} style={{ display: 'flex', gap: 4 }}>
                                            {room.privacy === 'private' && <span className={styles.badge}>Private</span>}
                                            <span style={{
                                                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                                background: isActive ? '#e8f5e9' : '#eee', color: isActive ? '#2e7d32' : '#888',
                                                fontWeight: 600, textTransform: 'uppercase'
                                            }}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {room.cover_url && <h3>{room.name}</h3>}

                                <p className={styles.desc}>{room.description || "No description provided."}</p>
                                <div className={styles.meta}>
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        {count === 1 ? '1 person reading' : `${count} people reading`}
                                    </span>
                                    <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#0071e3' }}>
                                        {room.access_code ? `#${room.access_code}` : ''}
                                    </span>
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

        </div>
    );
}
