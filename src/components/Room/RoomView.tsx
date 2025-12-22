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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const joinRoomAndFetchDetails = async () => {
            if (!user || !roomId) return;
            console.log("Fetching details for room:", roomId);

            // 1. Fetch Room Details
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select(`owner_id, access_code, name, privacy, profiles (username)`)
                .eq('id', roomId)
                .single();

            if (roomError) {
                // Gracefully handle "Row not found" (PGRST116)
                if (roomError.code === 'PGRST116') {
                    console.warn("Room not found (likely deleted).");
                    setRoomName("Room Not Found");
                } else {
                    console.error("Error fetching room details (JSON):", JSON.stringify(roomError, null, 2));
                    setRoomName("Error: " + roomError.message);
                }
                return; // Stop here if room error
            } else if (roomData) {
                console.log("Room Data Loaded:", roomData);
                setRoomOwnerId(roomData.owner_id);
                setAccessCode(roomData.access_code);
                setRoomName(roomData.name);
                setPrivacyType(roomData.privacy);
                // @ts-ignore
                setOwnerName(roomData.profiles?.username || 'Unknown');
            } else {
                setRoomName("Room Not Found");
                return; // Stop here if no data
            }

            // 2. Add current user to 'participants' table (Important for RLS!)
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

        joinRoomAndFetchDetails();

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
        return <Auth />;
    }

    // Calculate participant count from presence (Filter out duplicate or invalid IDs)
    // Calculate participant count matching Sidebar logic exactly
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

    const isHost = user?.id === roomOwnerId;

    return (
        <div onMouseMove={handleMouseMove} style={{ height: '100%' }}>
            <RoomLayout
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
                        onToggleSidebar={() => setIsSidebarOpen(true)}
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
