import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { BOT_NAMES } from '@/lib/constants';

interface LeaderboardModalProps {
    onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
    const { user } = useAuth(); // [NEW] Get current user
    const [leaders, setLeaders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFrame, setTimeFrame] = useState<'all' | 'weekly'>('all'); // Placeholder for future filter

    useEffect(() => {
        const fetchLeaders = async () => {
            setLoading(true);
            // Query profiles. We'll order by streak_count for now as it's a good engagement metric, 
            // or we could assume a 'total_read_time' if we had it.
            // Let's stick to what we saw in the sidebar: "Streak" and "Minutes Read". 
            // If we don't have accurate read time, streak is safer.
            // But TopReaders.tsx used 'total_time_read'. Let's see if that column exists or if we should fallback.

            try {
                // [FIX] Fallback: Fetch 200 items and filter via JS
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, streak_count, last_active_date, books_read_count')
                    // .eq('is_bot', false)
                    .order('books_read_count', { ascending: false }) // [FIX] Match TopReaders sorting
                    .order('total_time_read', { ascending: false })  // [FIX] Match Secondary sort
                    .limit(200);

                if (data) {
                    setLeaders(data.slice(0, 150)); // [FIX] Show all participants, including seeded Indian ones
                }
                if (error) console.error("Leaderboard fetch error:", error);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaders();
    }, [timeFrame]);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(240, 234, 214, 0.6)', backdropFilter: 'blur(8px)' // Parchment glass
        }} onClick={onClose}>
            <div style={{
                width: '100%', maxWidth: '480px', maxHeight: '80vh',
                background: 'var(--card-bg)', borderRadius: '2px', // Paper edges
                border: '1px solid var(--border-subtle)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(60, 50, 40, 0.2)', // Warm shadow
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Decorative Binding Line */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--primary)' }} />

                {/* Header */}
                <div style={{ padding: '24px 24px 24px 32px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontFamily: 'var(--font-serif)', color: 'var(--foreground)', fontStyle: 'italic' }}>Top Readers</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px', fontFamily: 'var(--font-serif)' }}>&times;</button>
                </div>

                {/* Content */}
                <div style={{ padding: '0 24px 0 32px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Reading the records...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px 0' }}>
                            {leaders.map((leader, i) => {
                                const isMe = user?.id === leader.id; // [NEW] Check if it's me
                                return (
                                    <div key={leader.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        padding: '12px 16px', borderRadius: '4px',
                                        background: isMe ? 'rgba(197, 160, 101, 0.1)' : 'transparent', // [HIGHLIGHT]
                                        borderBottom: '1px solid rgba(0,0,0,0.05)'
                                    }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: i < 3 ? 'var(--primary)' : 'var(--surface-hover)',
                                            color: i < 3 ? '#FFF' : 'var(--text-muted)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 'bold', fontFamily: 'var(--font-serif)'
                                        }}>
                                            {i + 1}
                                        </div>

                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                            <img
                                                src={leader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`}
                                                alt={leader.username}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(30%)' }}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.onerror = null; // Prevent infinite loop
                                                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`;
                                                }}
                                            />
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: isMe ? 'var(--primary)' : 'var(--foreground)', fontSize: '16px', fontWeight: '600', fontFamily: 'var(--font-serif)' }}>
                                                {leader.username} {isMe && '(You)'}
                                            </div>
                                            <div style={{
                                                color: 'var(--text-muted)',
                                                fontSize: '12px',
                                                fontFamily: 'var(--font-serif)',
                                                fontStyle: 'italic',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                columnGap: '12px',
                                                rowGap: '2px'
                                            }}>
                                                <span>📖 {leader.books_read_count || 0} Books</span>
                                                <span>🕯️ {leader.streak_count || 0} Day Streak</span>
                                            </div>
                                        </div>

                                        {i === 0 && <span style={{ fontSize: '20px' }}>👑</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
