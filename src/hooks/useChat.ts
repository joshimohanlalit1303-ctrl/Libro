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
                const mapped = data.map((msg: any) => ({
                    ...msg,
                    sender_name: msg.profiles?.username || 'Unknown'
                }));
                setMessages(mapped);
            }
        };

        fetchHistory();

        // Subscribe to new messages
        const channel = supabase
            .channel(`chat:${roomId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    const newMessage = payload.new as Message;
                    // Optimistically fetch sender name or just invalidation
                    const { data } = await supabase.from('profiles').select('username').eq('id', newMessage.user_id).single();

                    setMessages((prev) => [...prev, { ...newMessage, sender_name: data?.username || '...' }]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const sendMessage = async (userId: string, content: string) => {
        await supabase.from('chat_messages').insert({
            room_id: roomId,
            user_id: userId,
            content
        });
    };

    return { messages, sendMessage };
};
