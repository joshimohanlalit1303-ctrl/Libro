import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Message {
    id: string;
    room_id: string;
    user_id: string;
    content: string;
    created_at: string;
    sender_name?: string; // optimizing by mocking or joining
}

export const useChat = (roomId: string) => {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (!roomId) return;

        // Fetch initial history
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
          *,
          profiles ( username )
        `)
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (data) {
                // console.log("[useChat] History fetched:", data.length);
                const mapped = data.map((msg: any) => ({
                    ...msg,
                    sender_name: msg.profiles?.username || 'Unknown'
                }));
                setMessages(mapped);
            } else if (error) {
                console.error("[useChat] Fetch History Error:", error);
            }
        };

        fetchHistory();

        // Subscribe to new messages (with slight delay to ensure RLS propagation)
        const channel = supabase.channel(`chat:${roomId}`);

        const timeoutId = setTimeout(async () => {
            // [DEBUG] Check Auth Session
            const { data: { session } } = await supabase.auth.getSession();
            console.log(`[useChat] Session valid? ${!!session} User: ${session?.user?.id}`);

            // [DEBUG] Check Participant Status
            if (session?.user) {
                const { count, error } = await supabase
                    .from('participants')
                    .select('*', { count: 'exact', head: true })
                    .match({ room_id: roomId, user_id: session.user.id });
                console.log(`[useChat] DB Participant check: ${count} (Error: ${error?.message})`);
            }

            channel
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
                    async (payload) => {
                        const newMessage = payload.new as Message;
                        const { data } = await supabase.from('profiles').select('username').eq('id', newMessage.user_id).single();
                        setMessages((prev) => [...prev, { ...newMessage, sender_name: data?.username || '...' }]);
                    }
                )
                .subscribe((status, err) => {
                    const timestamp = new Date().toISOString();
                    if (status === 'SUBSCRIBED') {
                        // console.log(`[useChat] Subscribed to ${roomId} at ${timestamp}`);
                    } else if (status === 'CHANNEL_ERROR') {
                        if (err) {
                            console.error(`[useChat] Subscription Error at ${timestamp}:`, err, "Status:", status);
                        } else {
                            console.warn(`[useChat] Subscription Failed (CHANNEL_ERROR) at ${timestamp}. Retrying...`);
                        }

                        // Retry logic: Retry up to 3 times
                        setTimeout(() => {
                            console.log("[useChat] Retrying subscription...");
                            channel.subscribe();
                        }, 2000);
                    }
                });
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const sendMessage = async (userId: string, content: string) => {
        const { error } = await supabase.from('chat_messages').insert({
            room_id: roomId,
            user_id: userId,
            content
        });

        if (error) {
            console.error("Error sending message:", error);
            if (error.code === '42501') {
                console.error("Permission denied (RLS). User might not be a participant.");
            }
        }
    };

    return { messages, sendMessage };
};
