"use client";

import React, { useState, useEffect } from 'react';
import { RoomLayout } from './RoomLayout';
import { Header } from './Header';
import { Sidebar } from '../Sidebar/Sidebar';
import { Reader } from '../Reader/Reader';

import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Auth } from '../Auth/Auth';
import { supabase } from '@/lib/supabase';



interface RoomViewProps {
    roomId: string;
}

export default function RoomView({ roomId }: RoomViewProps) {
    const { user, loading } = useAuth();

    const { presence, updateCursor, status } = useRealtime(
        roomId,
        user?.id || '',
        user?.user_metadata?.username || 'Guest'
    );

    // Fetch room owner and handle Joining (add to participants)
    const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
    const isHost = user?.id === roomOwnerId;
    const [ownerName, setOwnerName] = useState<string | null>(null);
    const [accessCode, setAccessCode] = useState<string | null>(null);
    // Dynamic Room Metadata
    const [roomName, setRoomName] = useState<string>('Loading Room...');
    const [privacyType, setPrivacyType] = useState<string>('public');

    const [isJoined, setIsJoined] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isFocusMode, setIsFocusMode] = useState(false);

    // [FIX] Auto-collapse sidebar on mobile
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, []);

    // Focus Mode with Fullscreen API
    const toggleFocusMode = async () => {
        try {
            if (!isFocusMode) {
                // Enter Fullscreen
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if ((document.documentElement as any).webkitRequestFullscreen) {
                    await (document.documentElement as any).webkitRequestFullscreen(); // Safari
                }
                setIsFocusMode(true);
            } else {
                // Exit Fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen(); // Safari
                }
                setIsFocusMode(false);
            }
        } catch (err) {
            console.error("Error toggling fullscreen:", err);
            // Fallback: just toggle state if API fails
            setIsFocusMode(!isFocusMode);
        }
    };

    // Sync state with browser fullscreen changes (e.g. user presses ESC)
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
            setIsFocusMode(isFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Appearance State (Lifted from Reader)
    const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
    // [FIX] Add 'dark' support and auto-detect
    const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('sans');
    const [fontSize, setFontSize] = useState(100);

    // [NEW] Auto-detect System Theme
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    // Focus Lock State (SDG 4.7)
    const [isFocusLocked, setIsFocusLocked] = useState(false);
    const [focusLockTime, setFocusLockTime] = useState(0);

    const handleFocusLock = (isLocked: boolean, time: number) => {
        setIsFocusLocked(isLocked);
        setFocusLockTime(time);

        // When locked, force sidebar closed
        if (isLocked) {
            setIsSidebarOpen(false);
            setIsFocusMode(true);
        }
    };


    // [STRICT] Redirect guests immediately to login (No Guest Preview)
    useEffect(() => {
        if (!loading && !user) {
            console.log("Guest detected. Redirecting to login...");
            window.location.href = `/?next=/room/${roomId}`;
        }
    }, [user, loading, roomId]);

    // Force Reader resize when sidebar toggles
    useEffect(() => {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }, [isSidebarOpen]);

    // Fetched Book Cover for Guest Preview (and general use)
    const [bookCover, setBookCover] = useState<string | null>(null);

    // Fetch Room Data (Safe for Guests if RLS allows public read)
    useEffect(() => {
        const fetchRoomData = async () => {
            const { data: roomData, error } = await supabase
                .from('rooms')
                .select(`owner_id, access_code, name, privacy, cover_url, profiles (username)`)
                .eq('id', roomId)
                .single();

            if (roomData) {
                setRoomName(roomData.name);
                setRoomOwnerId(roomData.owner_id);
                setAccessCode(roomData.access_code);
                setPrivacyType(roomData.privacy);
                setBookCover(roomData.cover_url);
                // @ts-ignore
                const owner = Array.isArray(roomData.profiles) ? roomData.profiles[0] : roomData.profiles;
                setOwnerName(owner?.username || 'Unknown');
            }
        };
        fetchRoomData();
    }, [roomId]);

    useEffect(() => {
        if (!user || !roomId) return;

        const joinRoom = async () => {
            console.log("Joining room as user:", user.id);

            // [FIX] Cleanup other sessions to ensure user is only active in ONE room
            // This prevents "ghost" presences if a previous tab was closed without cleanup
            if (user) {
                await supabase.from('participants').delete().eq('user_id', user.id).neq('room_id', roomId);
            }

            // 2. Add current user to 'participants' table (Important for RLS!)
            // Try with last_seen first (Heartbeat logic)
            let { error: joinError } = await supabase.from('participants').upsert({
                room_id: roomId,
                user_id: user.id,
                role: 'viewer',
                last_seen: new Date().toISOString()
            }, { onConflict: 'room_id, user_id' });

            // Fallback: If migration hasn't run (missing column), retry without it
            if (joinError && (joinError.code === '42703' || joinError.message?.includes('last_seen'))) {
                console.warn("Heartbeat column missing, falling back to legacy join.");
                const retry = await supabase.from('participants').upsert({
                    room_id: roomId,
                    user_id: user.id,
                    role: 'viewer'
                }, { onConflict: 'room_id, user_id' });
                joinError = retry.error;
            }

            // [FIX] Self-healing: If profile missing (FK error 23503), create it and retry
            if (joinError && joinError.code === '23503') {
                console.warn("Missing profile detected. Attempting self-repair...");
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: user.id,
                    username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                });

                if (!profileError) {
                    // Retry join
                    const retry = await supabase.from('participants').upsert({
                        room_id: roomId,
                        user_id: user.id,
                        role: 'viewer',
                        last_seen: new Date().toISOString()
                    }, { onConflict: 'room_id, user_id' });
                    joinError = retry.error;
                } else {
                    console.error("Failed to repair profile:", profileError);
                }
            }

            if (joinError) {
                console.error("Error joining room (Final):", JSON.stringify(joinError, null, 2));
                // Only allow proceeding if it's a transient or duplicate error, otherwise block
                // Duplicate code = 23505
                if (joinError.code !== '23505' && joinError.code !== '42703') {
                    alert("Failed to join room. Please refresh.");
                    return;
                }
            }

            setIsJoined(true);

            // [NEW] Update Streak on successful join
            if (user) {
                try {
                    console.log("Updating streak for user:", user.id);
                    await supabase.rpc('update_streak', { user_uuid: user.id });
                } catch (e) {
                    console.warn("Streak update failed:", e);
                }
            }
        };

        joinRoom();

        // Heartbeat: Update last_seen every 10 seconds
        // Heartbeat: Update last_seen every 10 seconds
        const heartbeatInterval = setInterval(async () => {
            if (user && roomId) {
                // Skip if offline
                if (typeof navigator !== 'undefined' && !navigator.onLine) return;

                try {
                    const { error } = await supabase.from('participants').update({ last_seen: new Date().toISOString() })
                        .match({ room_id: roomId, user_id: user.id });

                    if (error) {
                        // Safe access to error properties
                        const code = error.code || '';
                        const message = error.message || '';

                        if (code === '42703') {
                            // Suppress "column does not exist"
                        } else if (code === '42501') {
                            console.error("Heartbeat failed: Permission denied (RLS). Missing policy?", error);
                        } else if (message.includes('Failed to fetch') || message.includes('Load failed') || message.includes('TypeError')) {
                            console.warn("Heartbeat skipped: Network unstable");
                        } else {
                            console.error("Heartbeat failed:", message);
                        }
                    }
                } catch (err: any) {
                    // Catch network errors that Supabase client might throw directly
                    if (err?.message?.includes('Failed to fetch') || err?.includes?.('Failed to fetch')) {
                        console.warn("Heartbeat skipped: Network unreachable");
                    } else {
                        console.error("Heartbeat unexpected error:", err);
                    }
                }
            }
        }, 10000);


        const cleanup = async () => {
            clearInterval(heartbeatInterval);
            if (user && roomId) {
                console.log("Leaving room, cleaning up participant...", roomId);
                await supabase.from('participants').delete().match({ room_id: roomId, user_id: user.id });
            }
        };

        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [roomId, user]);

    // [FIX] Sync DB participants for robustness (Fallback if Realtime is flaky)
    const [dbParticipants, setDbParticipants] = useState<any[]>([]);

    useEffect(() => {
        if (!roomId) return;

        const fetchDbParticipants = async () => {
            // 1 minute active threshold - generous to avoid flickering
            const threshold = new Date(Date.now() - 60000).toISOString();
            const { data } = await supabase
                .from('participants')
                .select(`
                    user_id,
                    role,
                    last_seen,
                    profiles (username)
                `)
                .eq('room_id', roomId)
                .gt('last_seen', threshold);

            if (data) {
                const formatted = data.map(p => {
                    const profileData = p.profiles as any;
                    const username = Array.isArray(profileData) ? profileData[0]?.username : profileData?.username;
                    return {
                        user_id: p.user_id,
                        username: username || 'Unknown',
                        role: p.role,
                        online_at: p.last_seen
                    };
                });
                setDbParticipants(formatted);
            }
        };

        fetchDbParticipants();
        const interval = setInterval(fetchDbParticipants, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [roomId]);


    // Calculate participant count from presence (Filter out duplicate or invalid IDs)
    const presenceParticipants = Object.values(presence)
        .flat()
        .filter(p => p.user_id && p.user_id !== 'undefined');

    // Merge Realtime + DB (Prefer Realtime for cursors, but ensure DB users are listed)
    // [OPTIMIZATION] Explicitly add current user to ensure "1 active" is shown immediately
    const currentUserPart = user ? {
        user_id: user.id,
        username: user.user_metadata?.username || 'Me',
        role: isHost ? 'owner' : 'viewer',
        online_at: new Date().toISOString()
    } : null;

    const uniqueParticipants = [...(currentUserPart ? [currentUserPart] : []), ...presenceParticipants, ...dbParticipants]
        .reduce((acc: any[], curr) => {
            if (!acc.find(p => p.user_id === curr.user_id)) {
                acc.push(curr);
            }
            return acc;
        }, []);

    const participantCount = uniqueParticipants.length;
    console.log("[RoomView] Presence:", presence);
    console.log("[RoomView] Unique P:", uniqueParticipants);
    console.log("[RoomView] Count:", participantCount);

    const lastCursorUpdate = React.useRef(0);

    const handleMouseMove = (e: React.MouseEvent) => {
        // Throttle cursor updates to every 100ms to prevent socket congestion
        const now = Date.now();
        if (now - lastCursorUpdate.current > 100) {
            if (user) {
                updateCursor(e.clientX, e.clientY);
                lastCursorUpdate.current = now;
            }
        }
    };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Authenticating...</div>;

    if (!user) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Redirecting to login...</div>;
    }

    return (
        <div onMouseMove={handleMouseMove} style={{ height: '100%' }}>
            <RoomLayout
                isSidebarOpen={isSidebarOpen}
                isFocusMode={isFocusMode}
                theme={theme}
                header={
                    <Header
                        roomId={roomId}
                        metadata={{
                            room_name: roomName,
                            privacy: { type: privacyType as 'public' | 'private', max_participants: 10 }
                        }}
                        participants={uniqueParticipants}
                        ownerName={ownerName}
                        status={status}
                        accessCode={accessCode}
                        onToggleFocusMode={toggleFocusMode}
                        isFocusMode={isFocusMode}

                        // Focus Lock Props
                        isFocusLocked={isFocusLocked}
                        focusLockTime={focusLockTime}

                        // Appearance Props
                        showAppearanceMenu={showAppearanceMenu}
                        setShowAppearanceMenu={setShowAppearanceMenu}
                        theme={theme}
                        setTheme={setTheme}
                        fontFamily={fontFamily}
                        setFontFamily={setFontFamily}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                    />
                }
                sidebar={
                    isJoined ? (
                        <Sidebar
                            roomId={roomId}
                            presence={presence}
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            ownerId={roomOwnerId}
                            participants={uniqueParticipants}
                            theme={theme}
                        />
                    ) : (
                        <div style={{ width: 300, padding: 20, color: '#888' }}>Joining...</div>
                    )
                }
            >
                <Reader
                    roomId={roomId}
                    isHost={isHost}
                    username={user?.user_metadata?.username || 'Guest'}
                    isFocusMode={isFocusMode}
                    onFocusLock={handleFocusLock}
                    toggleFocusMode={toggleFocusMode}

                    // Appearance Props
                    theme={theme}
                    setTheme={setTheme}
                    fontFamily={fontFamily}
                    setFontFamily={setFontFamily}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    showAppearanceMenu={showAppearanceMenu}
                    setShowAppearanceMenu={setShowAppearanceMenu}
                    onSwipeUp={() => setIsSidebarOpen(true)}
                    onSwipeDown={() => setIsSidebarOpen(false)}
                />
            </RoomLayout>
        </div>
    );
}
