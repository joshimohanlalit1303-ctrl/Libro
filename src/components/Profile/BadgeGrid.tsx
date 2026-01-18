import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

// Simple SVG Icons to replace lucide-react
const Icons = {
    Sunrise: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 22 4-10 4 10" /><path d="M12 18h.01" /></svg>
    ),
    BookOpen: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
    ),
    Users: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    Award: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
    )
};

type Achievement = Database['public']['Tables']['achievements']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

interface EnrichedAchievement extends Achievement {
    isUnlocked: boolean;
    unlockedAt?: string;
}

// Icon mapper
const IconMap: Record<string, React.ReactNode> = {
    'Sunrise': <Icons.Sunrise />,
    'BookOpen': <Icons.BookOpen />,
    'Users': <Icons.Users />,
    'Default': <Icons.Award />
};

export const BadgeGrid = ({ userId }: { userId: string }) => {
    // const supabase = createClientComponentClient<Database>(); // Removed
    const [achievements, setAchievements] = useState<EnrichedAchievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBadges() {
            setLoading(true);

            // Fetch all available achievements
            const { data: allBadges, error: badgesError } = await supabase
                .from('achievements')
                .select('*');

            if (badgesError) {
                console.error("Error fetching badges", badgesError);
                return;
            }

            // Fetch user's unlocked badges
            const { data: userBadges, error: userError } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId);

            if (userError) {
                console.error("Error fetching user badges", userError);
                return;
            }

            // Merge
            const unlockedIds = new Set(userBadges?.map(ub => ub.achievement_id));
            const enriched = (allBadges || []).map(badge => ({
                ...badge,
                isUnlocked: unlockedIds.has(badge.id),
                unlockedAt: userBadges?.find(ub => ub.achievement_id === badge.id)?.unlocked_at
            }));

            setAchievements(enriched);
            setLoading(false);
        }

        if (userId) fetchBadges();
    }, [userId, supabase]);

    if (loading) return <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading badges...</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 16, marginTop: 16 }}>
            {achievements.map((badge) => (
                <div
                    key={badge.id}
                    style={{
                        background: 'var(--card-bg)',
                        border: `1px solid ${badge.isUnlocked ? 'rgba(245, 158, 11, 0.3)' : 'var(--card-border)'}`,
                        borderRadius: 12,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        opacity: badge.isUnlocked ? 1 : 0.6,
                        filter: badge.isUnlocked ? 'none' : 'grayscale(100%)',
                        transition: 'all 0.2s',
                        boxShadow: badge.isUnlocked ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    <div style={{
                        color: badge.isUnlocked ? '#f59e0b' : 'var(--text-secondary)',
                        marginBottom: 10,
                        padding: 10,
                        background: badge.isUnlocked ? 'rgba(245, 158, 11, 0.1)' : 'var(--input-bg)',
                        borderRadius: '50%'
                    }}>
                        {IconMap[badge.icon_url || 'Default'] || IconMap['Default']}
                    </div>

                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {badge.name}
                    </span>

                    {/* Tooltip-ish description */}
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                        {badge.description}
                    </span>
                </div>
            ))}
        </div>
    );
};
