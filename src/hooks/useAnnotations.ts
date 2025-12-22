import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Annotation {
    id: string;
    room_id: string;
    user_id: string;
    cfi_range: string; // For now, we might just store "Page X" or similar if not using real engine
    note: string;
    highlight_color: string;
    created_at: string;
    user?: { username: string };
}

export const useAnnotations = (roomId: string) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);

    useEffect(() => {
        if (!roomId) return;

        // Fetch initial annotations
        const fetchAnnotations = async () => {
            const { data } = await supabase
                .from('annotations')
                .select(`
          *,
          profiles ( username )
        `)
                .eq('room_id', roomId)
                .order('created_at', { ascending: false });

            if (data) {
                const mapped = data.map((ann: any) => ({
                    ...ann,
                    user: { username: ann.profiles?.username || 'Unknown' }
                }));
                setAnnotations(mapped);
            }
        };

        fetchAnnotations();

        // Subscribe to changes
        const channel = supabase
            .channel(`annotations:${roomId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'annotations', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const { data } = await supabase.from('profiles').select('username').eq('id', payload.new.user_id).single();
                        const newAnn = { ...payload.new, user: { username: data?.username || '...' } } as Annotation;
                        setAnnotations(prev => [newAnn, ...prev]);
                    }
                    // Handle DELETE/UPDATE if needed
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const addAnnotation = async (userId: string, note: string, page: number) => {
        // Mock CFI for now since we don't have a real epub engine
        const mockCfi = `epubcfi(/6/4[chap01]!/4/${page}/1:0)`;

        await supabase.from('annotations').insert({
            room_id: roomId,
            user_id: userId,
            note,
            cfi_range: mockCfi,
            highlight_color: '#FFEB3B'
        });
    };

    return { annotations, addAnnotation };
};
