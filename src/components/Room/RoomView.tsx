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
    const [ownerName, setOwnerName] = useState<string | null>(null);
    const [accessCode, setAccessCode] = useState<string | null>(null);
    // Dynamic Room Metadata
    const [roomName, setRoomName] = useState<string>('Loading Room...');
    const [privacyType, setPrivacyType] = useState<string>('public');

    const [isJoined, setIsJoined] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

            if (joinError) {
                console.error("Error joining room (Final):", JSON.stringify(joinError, null, 2));
            }

            setIsJoined(true);
        };

        joinRoom();

        // Heartbeat: Update last_seen every 10 seconds
        const heartbeatInterval = setInterval(async () => {
            if (user && roomId) {
                const { error } = await supabase.from('participants').update({ last_seen: new Date().toISOString() })
                    .match({ room_id: roomId, user_id: user.id });

                // If column missing, suppress error to avoid spam
                if (error && error.code === '42703') {
                    // Optionally clear interval if we know it will never work
                    // clearInterval(heartbeatInterval); 
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

    // Calculate participant count from presence (Filter out duplicate or invalid IDs)
    const uniqueParticipants = Object.values(presence)
        .flat()
        .filter(p => p.user_id && p.user_id !== 'undefined')
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

    // Guest Preview UI
    if (!user) {
        return (
            <div style={{
                height: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#f5f5f7', position: 'relative', overflow: 'hidden'
            }}>
                {/* Blurred Background */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: bookCover ? `url(${bookCover})` : 'none',
                    backgroundSize: 'cover', filter: 'blur(20px)', opacity: 0.3, zIndex: 0
                }} />

                <div style={{
                    zIndex: 1, background: 'rgba(255,255,255,0.85)', padding: 40,
                    borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    maxWidth: 400, width: '90%', textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{
                        width: 120, height: 180, background: '#ddd', margin: '0 auto 24px',
                        borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    }}>
                        {bookCover ? (
                            <img src={bookCover} alt="Book Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📖</div>
                        )}
                    </div>

                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>{roomName}</h1>
                    <p style={{ color: '#666', marginBottom: 32 }}>Hosted by {ownerName || '...'}</p>

                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#0071e3', color: 'white', border: 'none',
                            padding: '12px 32px', borderRadius: 20, fontSize: 16, fontWeight: 600,
                            cursor: 'pointer', width: '100%'
                        }}
                    >
                        Login to Join
                    </button>
                    <p style={{ fontSize: 12, color: '#888', marginTop: 16 }}>
                        Join <strong>{uniqueParticipants.length > 0 ? uniqueParticipants.length : 'others'}</strong> currently reading.
                    </p>
                </div>

                <div style={{ display: 'none' }}><Auth /></div>
            </div>
        );
    }

    const isHost = user?.id === roomOwnerId;

    return (
        <div onMouseMove={handleMouseMove} style={{ height: '100%' }}>
            <RoomLayout
                isSidebarOpen={isSidebarOpen}
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
                        onToggleSidebar={() => {
                            console.log("Toggle Sidebar Clicked. Current:", isSidebarOpen);
                            setIsSidebarOpen(prev => !prev);
                        }}
                        isSidebarOpen={isSidebarOpen}
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
                        />
                    ) : (
                        <div style={{ width: 300, padding: 20, color: '#888' }}>Joining...</div>
                    )
                }
            >
                <Reader roomId={roomId} isHost={isHost} username={user?.user_metadata?.username || 'Guest'} />
            </RoomLayout>
        </div>
    );
}
