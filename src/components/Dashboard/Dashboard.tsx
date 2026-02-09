"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './Dashboard.module.css';
import { CreateRoomModal } from './CreateRoomModal';
import { AddBookModal } from './AddBookModal';
import { LeaderboardModal } from './LeaderboardModal';
import { CorrespondenceModal } from './CorrespondenceModal';
import { ArchivesModal } from './ArchivesModal'; // [NEW]
// import { ScholarshipBoard } from './ScholarshipBoard'; // [NEW-SDG-4.b] REMOVED


import { useRouter } from 'next/navigation';
import { TopReaders } from './TopReaders'; // Re-enabled
import { IntentionModal } from './IntentionModal';
// import { DailyQuote } from './DailyQuote'; // Removed V2
import { Auth } from '../Auth/Auth';
// import { StreakWarning } from './StreakWarning'; // Removed V2
import { CrypticMessage } from './CrypticMessage';
import { Fragments } from './Fragments';
import { CompleteProfile } from '../Auth/CompleteProfile';
import Grimoire from './Grimoire'; // [NEW]

export default function Dashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showAddBook, setShowAddBook] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCorrespondence, setShowCorrespondence] = useState(false);
    const [showArchives, setShowArchives] = useState(false); // [NEW]
    const [recentRooms, setRecentRooms] = useState<any[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);

    // Fetch Notifications
    useEffect(() => {
        if (!user) return;
        const fetchNotifs = async () => {
            const { count } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('addressee_id', user.id)
                .eq('status', 'pending');
            setNotificationCount(count || 0);
        };
        fetchNotifs();
        // Subscribe
        const channel = supabase.channel('notifs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` }, () => {
                fetchNotifs();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // ... [Rest of Recent Rooms Logic Unchanged] ...
    // To save context size, I will abbreviate the fetchRecent logic unless necessary. 
    // Actually, I should keep it to avoid deleting it. 
    // Wait, the user wants me to edit the file. I should rewrite it carefully or uses Replace.

    // [NEW] Fetch Recent Rooms Logic
    const fetchRecent = useCallback(async () => {
        if (!user) return;
        // 1. Get recent participants entries for this user
        const { data: participations } = await supabase
            .from('participants')
            .select('room_id, last_seen')
            .eq('user_id', user.id)
            .order('last_seen', { ascending: false })
            .limit(10); // Check last 10 visited

        if (!participations || participations.length === 0) return;

        // Unique Room IDs
        const roomIds = Array.from(new Set(participations.map(p => p.room_id)));

        if (roomIds.length === 0) return;

        // 2. Fetch Room Details (Without embedding books to avoid FK ambiguity)
        const { data: roomsOnly } = await supabase
            .from('rooms')
            .select('*, participants(last_seen)')
            .in('id', roomIds);

        if (!roomsOnly) return;

        // 2b. Fetch Books separately
        const roomBookIds = roomsOnly.map(r => r.book_id).filter(Boolean);
        const { data: booksData } = await supabase
            .from('books')
            .select('id, title, author')
            .in('id', roomBookIds);

        const booksMap = (booksData || []).reduce((acc: any, b) => ({ ...acc, [b.id]: b }), {});

        // Merge
        const roomsData = roomsOnly.map(r => ({ ...r, books: booksMap[r.book_id] }));

        // 3. Filter out Completed Books
        const bookIds = roomsData.map(r => r.book_id).filter(Boolean);
        let verifiedRoomIds = roomIds; // Default to all

        if (bookIds.length > 0) {
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('book_id, is_completed')
                .eq('user_id', user.id)
                .in('book_id', bookIds);

            if (progressData) {
                const completedBooks = new Set(progressData.filter(p => p.is_completed).map(p => p.book_id));
                // Exclude rooms with completed books
                verifiedRoomIds = roomsData
                    .filter(r => !completedBooks.has(r.book_id))
                    .map(r => r.id);
            }
        }

        // 4. Sort by original Recency (participations order) & Limit to 2
        const sortedRecent = roomsData
            .filter(r => verifiedRoomIds.includes(r.id))
            .sort((a, b) => {
                const idxA = roomIds.indexOf(a.id);
                const idxB = roomIds.indexOf(b.id);
                return idxA - idxB;
            })
            .slice(0, 4);

        setRecentRooms(sortedRecent);
    }, [user]);

    useEffect(() => {
        fetchRecent();
    }, [user, rooms, fetchRecent]); // Re-run when rooms refresh (e.g. participation changes)

    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // [PIVOT] Intention Flow State
    const [showIntentionModal, setShowIntentionModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<null | { type: 'create' } | { type: 'join', code?: string }>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [activeTab, setActiveTab] = useState<'rooms' | 'grimoire'>('rooms'); // [NEW]



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

    // [REMOVED] Session Report check
    // Logic removed per user request

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
            // [FIX] Decoupled fetch to avoid "Ambiguous Relationship" error permanently
            const { data: roomsOnly, error } = await supabase.from('rooms')
                .select('*, participants(last_seen)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Dashboard: Error fetching rooms:", error.message);
                if (error.message?.includes('Failed to fetch')) {
                    // Simple retry logic could go here, but omitted for brevity in hotfix
                    console.log("Network error, please refresh.");
                }
            }

            let mergedData: any[] = [];
            if (roomsOnly) {
                const bookIds = roomsOnly.map(r => r.book_id).filter(Boolean);
                let booksMap: any = {};
                if (bookIds.length > 0) {
                    const { data: bData } = await supabase.from('books').select('id, page_count, title, author').in('id', bookIds);
                    if (bData) bData.forEach(b => booksMap[b.id] = b);
                }
                mergedData = roomsOnly.map(r => ({ ...r, books: booksMap[r.book_id] }));
            }

            console.log("Dashboard: Fetched rooms", mergedData?.length);
            setRooms(mergedData);
        };
        fetchRooms();

        // Debounce Logic
        let debounceTimer: NodeJS.Timeout;
        const debouncedFetch = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchRooms();
            }, 1000);
        };

        const channel = supabase.channel('public:rooms')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, async (payload) => {
                // Fetch book info for new room
                const newRoom = { ...payload.new, participants: [] } as any;
                if (newRoom.book_id) {
                    const { data: b } = await supabase.from('books').select('title, author, page_count').eq('id', newRoom.book_id).single();
                    if (b) newRoom.books = b;
                }
                setRooms(prev => [newRoom, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms' }, payload => {
                setRooms(prev => prev.filter(room => room.id !== payload.old.id));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
                debouncedFetch();
                fetchRecent();
            })
            .subscribe();

        // [FIX] Periodic refresh to ensure "Active" status and participant counts are fresh
        // This handles cases where Realtime might miss an event or connection drops
        const refreshInterval = setInterval(() => {
            fetchRooms();
        }, 30000); // 30 seconds

        return () => {
            supabase.removeChannel(channel);
            clearTimeout(debounceTimer);
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
        // [FIX] Tighten "active" threshold to 45 seconds (was 5 mins)
        // 45s allows for 4 missed heartbeats (10s each) before marking inactive
        const active = (room.participants || []).filter((p: any) => {
            const lastSeen = p.last_seen ? new Date(p.last_seen).getTime() : 0;
            return (Date.now() - lastSeen) < 45000;
        }).length;
        return acc + active;
    }, 0);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo}>Libro</div>

                <div className={styles.headerRight}>
                    {/* [NEW] Archives / Academics */}
                    <div
                        className={styles.headerItem}
                        onClick={() => setShowArchives(true)}
                        style={{ cursor: 'pointer', marginRight: 24, display: 'flex', alignItems: 'center', opacity: 0.8 }}
                        title="The Archives (Question Papers)"
                    >
                        <span style={{ fontSize: '1.2rem' }}>📜</span>
                    </div>

                    {/* [NEW] Sealed Correspondence Icon */}
                    <div
                        className={styles.headerItem}
                        onClick={() => setShowCorrespondence(true)}
                        style={{ cursor: 'pointer', marginRight: 24, display: 'flex', alignItems: 'center', opacity: 0.8, position: 'relative' }}
                        title="Sealed Correspondence"
                    >
                        <span style={{ fontSize: '1.2rem' }}>💌</span>
                        {notificationCount > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: -2,
                                right: -4,
                                width: 8,
                                height: 8,
                                background: 'red',
                                borderRadius: '50%',
                                border: '1px solid var(--header-bg, #fff)'
                            }} />
                        )}
                    </div>

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

                {/* [REMOVED] Session Report Toast per user request */}

                {/* 2. Presence Indicator (Minimal) */}
                {/* 2. Presence Indicator (Minimal) */}
                <div style={{ textAlign: 'center', marginBottom: '4rem', opacity: 0.6, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <span className={styles.liveDot}>●</span>
                    {totalReaders === 0 ? 'Silence in the library' : `${totalReaders} Silent Readers Active`}
                </div>

                {/* Tab Switcher */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '3rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                    <button
                        onClick={() => setActiveTab('rooms')}
                        style={{
                            background: 'none', border: 'none', fontSize: '14px', letterSpacing: '0.1em', cursor: 'pointer',
                            color: activeTab === 'rooms' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'rooms' ? 700 : 400,
                            position: 'relative'
                        }}
                    >
                        READING ROOMS
                        {activeTab === 'rooms' && <div style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: 2, background: 'var(--primary)' }} />}
                    </button>
                    <button
                        onClick={() => setActiveTab('grimoire')}
                        style={{
                            background: 'none', border: 'none', fontSize: '14px', letterSpacing: '0.1em', cursor: 'pointer',
                            color: activeTab === 'grimoire' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'grimoire' ? 700 : 400,
                            position: 'relative'
                        }}
                    >
                        THE GRIMOIRE (VAULT)
                        {activeTab === 'grimoire' && <div style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: 2, background: 'var(--primary)' }} />}
                    </button>
                </div>

                {activeTab === 'rooms' ? (
                    <>
                        <div className={styles.sectionHeader}>
                            <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', textTransform: 'none', letterSpacing: 'normal', color: 'var(--foreground)' }}>Available Rooms</h2>

                            <div className={styles.searchContainer} style={{ marginRight: 'auto', marginLeft: '32px', maxWidth: '300px' }}>
                                <input
                                    type="text"
                                    placeholder="Find a room..."
                                    className={styles.searchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

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

                        {/* Recent Rooms Section */}
                        {recentRooms.length > 0 && (
                            <div style={{ marginBottom: '4rem' }}>
                                <h3 style={{ fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                    Recently Joined Rooms
                                </h3>
                                <div className={styles.grid}>
                                    {recentRooms.map(room => {
                                        // Re-use the card logic/styles or make a dedicated simpler card?
                                        // Re-using card style for consistency
                                        const now = new Date();
                                        const activeCount = (room.participants || []).filter((p: any) => {
                                            if (p.last_seen) return (now.getTime() - new Date(p.last_seen).getTime()) < 45000;
                                            return false;
                                        }).length;
                                        const isActive = activeCount > 0;

                                        return (
                                            <div key={`recent-${room.id}`} className={styles.card} onClick={() => router.push(`/room/${room.id}`)} style={{ borderColor: 'var(--primary)', borderWidth: '1px', borderStyle: 'solid' }}>
                                                <div className={styles.cardImageContainer} style={{ height: '180px' }}> {/* Slightly smaller? */}
                                                    {room.cover_url ? (
                                                        <img src={room.cover_url} alt={room.name} className={styles.cardImage} />
                                                    ) : (
                                                        <div className={styles.cardImageFallback} style={{ backgroundColor: 'var(--surface-hover)' }}>
                                                        </div>
                                                    )}
                                                    <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : ''}`}>
                                                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </div>

                                                <div className={styles.cardContent}>
                                                    <h3 className={styles.cardTitle}>{room.books?.title || room.name}</h3>
                                                    <p className={styles.cardDesc} style={{
                                                        fontSize: '11px',
                                                        fontStyle: 'italic',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '4px'
                                                    }}>
                                                        by {room.books?.author || "Unknown Author"}
                                                    </p>
                                                    <p className={styles.cardDesc} style={{ WebkitLineClamp: 1 }}>{room.description || "Pick up where you left off"}</p>

                                                    <div className={styles.cardFooter} style={{ marginTop: 'auto', paddingTop: '12px' }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span>▶</span> RESUME
                                                        </span>
                                                        <span className={styles.peopleReading}>
                                                            {activeCount > 0 ? `${activeCount} ACTIVE` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className={styles.dashboardLayout}>
                            <div className={styles.mainColumn}>
                                <div className={styles.grid}>
                                    {filteredRooms.map(room => {
                                        const now = new Date();
                                        const activeCount = (room.participants || []).filter((p: any) => {
                                            if (p.last_seen) return (now.getTime() - new Date(p.last_seen).getTime()) < 45000;
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
                                                    <h3 className={styles.cardTitle}>{room.books?.title || room.name}</h3>
                                                    <p className={styles.cardDesc} style={{
                                                        fontSize: '12px',
                                                        fontStyle: 'italic',
                                                        color: 'var(--text-secondary)',
                                                        marginBottom: '4px'
                                                    }}>
                                                        by {room.books?.author || "Unknown Author"}
                                                    </p>
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
                                <TopReaders />

                                <div className={styles.sidebarCard}>
                                    <h4 style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>DAILY INSPIRATION</h4>
                                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', lineHeight: '1.4', fontStyle: 'italic', color: 'var(--foreground)' }}>
                                        "We read to know we are not alone."
                                    </p>
                                    <div style={{ textAlign: 'right', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>— C.S. Lewis</div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ paddingBottom: '4rem' }}>
                        <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', marginBottom: '2rem' }}>Your Linguistic Vault</h2>
                        <Grimoire />
                    </div>
                )}
            </main>

            {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
            {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} onSuccess={() => alert('Book added!')} />}
            {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

            {showCorrespondence && (
                <CorrespondenceModal onClose={() => setShowCorrespondence(false)} />
            )}

            {showArchives && (
                <ArchivesModal onClose={() => setShowArchives(false)} />
            )}

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
