import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Highlight {
    id: string;
    user_id: string;
    book_id: string;
    room_id?: string;
    cfi_range: string;
    text_content?: string;
    color: string;
    created_at: string;
    reactions?: HighlightReaction[];
    profiles?: { username: string } | { username: string }[]; // Joined data
}

export interface HighlightReaction {
    id: string;
    highlight_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
}

export const useHighlights = (bookId?: string, roomId?: string) => {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch initial highlights
    const fetchHighlights = useCallback(async () => {
        if (!bookId) return;

        setLoading(true);
        // Build query
        let query = supabase
            .from('highlights')
            .select(`
                *,
                reactions:highlight_reactions(*)
            `)
            .eq('book_id', bookId);

        // Optional: Filter by room or keep it global for the book?
        // If room_id is provided, maybe we prioritize room highlights OR show all?
        // User said "everyone will see it", usually implies Room context here.
        if (roomId) {
            query = query.eq('room_id', roomId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching highlights:', error);
        } else {
            const rawHighlights = data as Highlight[] || [];

            // [FIX] Manually fetch profiles since foreign key might not support direct join
            const userIds = Array.from(new Set(rawHighlights.map(h => h.user_id)));

            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', userIds);

                if (!profileError && profiles) {
                    const profileMap = new Map(profiles.map(p => [p.id, p]));
                    // Attach profile to highlight
                    const merged = rawHighlights.map(h => ({
                        ...h,
                        profiles: profileMap.get(h.user_id) || { username: 'Unknown' }
                    }));
                    setHighlights(merged);
                    setLoading(false);
                    return;
                }
            }

            setHighlights(rawHighlights);
        }
        setLoading(false);
    }, [bookId, roomId]);

    useEffect(() => {
        fetchHighlights();
    }, [fetchHighlights]);

    // Real-time Subscription
    useEffect(() => {
        if (!bookId) return;

        const channel = supabase
            .channel(`highlights:${bookId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'highlights',
                    filter: `book_id=eq.${bookId}` // Filter by book
                },
                (payload) => {
                    if (roomId && payload.new && 'room_id' in payload.new && payload.new.room_id !== roomId) {
                        return; // Ignore updates for other rooms if strictly scoped
                    }
                    console.log('Highlight Change:', payload);
                    fetchHighlights(); // Simple strategy: Refetch to get fresh joined data (reactions)
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'highlight_reactions'
                },
                (payload) => {
                    // We can't easily filter reactions by book_id directly on subscription, 
                    // but we can just refetch if we get a reaction update.
                    // Optimisation: Could check if the highlighted ID exists in our local list.
                    console.log('Reaction Change:', payload);
                    fetchHighlights();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bookId, roomId, fetchHighlights]);

    const addHighlight = useCallback(async (cfiRange: string, text: string, color: string = '#fef3c7') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !bookId) return;

        const { error } = await supabase
            .from('highlights')
            .insert({
                user_id: user.id,
                book_id: bookId,
                room_id: roomId,
                cfi_range: cfiRange,
                text_content: text,
                color
            });

        if (error) {
            console.error('Error adding highlight:', error);
            throw new Error(error.message || 'Failed to add highlight');
        }
    }, [bookId, roomId]);

    const deleteHighlight = useCallback(async (id: string) => {
        const { error } = await supabase.from('highlights').delete().eq('id', id);
        if (error) throw new Error(error.message || 'Failed to delete highlight');
    }, []);

    const addReaction = useCallback(async (highlightId: string, emoji: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('highlight_reactions')
            .insert({
                highlight_id: highlightId,
                user_id: user.id,
                emoji
            });

        if (error) throw new Error(error.message || 'Failed to add reaction');
    }, []);

    const removeReaction = useCallback(async (highlightId: string, emoji: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('highlight_reactions')
            .delete()
            .match({ highlight_id: highlightId, user_id: user.id, emoji });

        if (error) throw new Error(error.message || 'Failed to remove reaction');
    }, []);

    return {
        highlights,
        loading,
        addHighlight,
        deleteHighlight,
        addReaction,
        removeReaction
    };
};
