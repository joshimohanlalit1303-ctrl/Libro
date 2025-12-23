import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceState {
    [key: string]: {
        user_id: string;
        username: string;
        cursor_x: number;
        cursor_y: number;
        online_at: string;
    }[];
}

export const useRealtime = (roomId: string, userId: string, username: string) => {
    const [presence, setPresence] = useState<PresenceState>({});
    const channelRef = useRef<RealtimeChannel | null>(null);
    const retryCount = useRef(0);
    // Start as DISCONNECTED to distinguish "not yet tried" from "trying"
    const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'DISCONNECTED' | 'CHANNEL_ERROR'>('DISCONNECTED');

    useEffect(() => {
        if (!roomId) {
            return;
        }

        console.log(`[Realtime] Initiating connection for Room: ${roomId}, User: ${userId || 'Guest'}`);
        setConnectionStatus('CONNECTING');

        // Cleanup any potential existing channel reference before creating a new one
        if (channelRef.current) {
            console.warn("[Realtime] Cleaning up stale channel reference before new subscription.");
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        // Create a unique channel for this room
        // WE MUST USE A UNIQUE TOPIC KEY for presence to avoid conflicts with the Reader's broadcast channel
        const channel = supabase.channel(`room-presence:${roomId}`, {
            config: {
                presence: {
                    key: userId || `guest-${Math.random().toString(36).substr(2, 9)}`,
                },
            },
        });

        channelRef.current = channel;

        // Connection timeout safety
        const connectionTimeout = setTimeout(() => {
            if (channelRef.current === channel && connectionStatus === 'CONNECTING') {
                console.error("[Realtime] Connection timed out (5s). Force-checking status or retrying.");
                // We don't force-fail, just warn likely network issue.
            }
        }, 5000);

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState() as PresenceState;
                // console.log("[Realtime] Presence Sync:", state);
                setPresence(state);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // console.log('[Realtime] Join:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // console.log('[Realtime] Leave:', key, leftPresences);
            })
            .subscribe(async (status, err) => {
                console.log(`[Realtime] Subscription status for room ${roomId}: ${status}`);

                if (status === 'SUBSCRIBED') {
                    clearTimeout(connectionTimeout);
                    retryCount.current = 0; // Reset retries on success
                    setConnectionStatus('SUBSCRIBED');

                    // Only track if we have a valid userId (i.e. not a guest)
                    if (userId) {
                        try {
                            const trackStatus = await channel.track({
                                user_id: userId,
                                username: username,
                                online_at: new Date().toISOString(),
                                cursor_x: 0,
                                cursor_y: 0
                            });
                            console.log("[Realtime] Tracked user:", { userId, username }, "Result:", trackStatus);
                        } catch (error) {
                            console.error("[Realtime] Error tracking user presence:", error);
                        }
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    // Downgrade to warn for transient errors, error only if persistent
                    console.warn(`[Realtime] Channel Issue: ${status} (Attempt ${retryCount.current + 1})`, err || 'Unknown Error');

                    // Retry logic with backoff
                    if (status === 'CHANNEL_ERROR') {
                        if (retryCount.current < 5) {
                            const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000); // 1s, 2s, 4s, 8s, 10s...
                            retryCount.current += 1;

                            console.log(`[Realtime] Attempting to re-subscribe in ${delay}ms...`);
                            setTimeout(() => {
                                if (channelRef.current === channel) {
                                    channel.subscribe();
                                }
                            }, delay);
                        } else {
                            console.error("[Realtime] Max retries reached. Connection failed permanently.");
                            setConnectionStatus('CHANNEL_ERROR');
                        }
                    } else {
                        setConnectionStatus('CHANNEL_ERROR');
                    }

                    setConnectionStatus('CHANNEL_ERROR');
                } else if (status === 'CLOSED') {
                    console.log("[Realtime] Channel Closed");
                    setConnectionStatus('DISCONNECTED');
                }
            });

        const cleanup = async () => {
            console.log(`[Realtime] Unmounting/Cleaning up channel for room: ${roomId}`);
            clearTimeout(connectionTimeout);
            if (channel) {
                await supabase.removeChannel(channel);
            }
            setConnectionStatus('DISCONNECTED');
            channelRef.current = null;
        };

        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [roomId, userId, username]);

    const updateCursor = async (x: number, y: number) => {
        if (channelRef.current && connectionStatus === 'SUBSCRIBED' && userId) {
            await channelRef.current.track({
                user_id: userId,
                username: username,
                online_at: new Date().toISOString(),
                cursor_x: x,
                cursor_y: y
            });
        }
    };

    return { presence, updateCursor, channel: channelRef.current, status: connectionStatus };
};
