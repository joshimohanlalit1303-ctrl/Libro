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

export const BadgeGrid = ({ userId, stats }: { userId: string, stats?: { createdAt?: string, booksRead?: number } }) => {
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

            // Fetch user's unlocked badges from standard achievements table
            const { data: userBadges, error: userError } = await supabase
                .from('user_achievements')
                .select('*')
                .eq('user_id', userId);

            // Fetch custom badges from profiles (JSONB)
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('badges')
                .eq('id', userId)
                .single();

            // Check Social Butterfly status (joined any room)
            const { count: roomCount } = await supabase
                .from('participants')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (userError) console.error("Error fetching user achievements", userError);

            // Merge Standard Badges
            const unlockedIds = new Set(userBadges?.map(ub => ub.achievement_id));

            // [FAILSAFE] Client-side logic overrides
            const isEarlyBird = stats?.createdAt && new Date(stats.createdAt) < new Date('2026-06-01');
            const isBookworm = (stats?.booksRead || 0) >= 1;
            const isSocialButterfly = (roomCount || 0) > 0;

            let enriched = (allBadges || []).map(badge => {
                let unlocked = unlockedIds.has(badge.id);
                // Override if conditions met
                if (badge.slug === 'early-bird' && isEarlyBird) unlocked = true;
                if (badge.slug === 'bookworm' && isBookworm) unlocked = true;
                if (badge.slug === 'social-butterfly' && isSocialButterfly) unlocked = true;

                return {
                    ...badge,
                    isUnlocked: unlocked,
                    unlockedAt: userBadges?.find(ub => ub.achievement_id === badge.id)?.unlocked_at
                };
            });

            // Merge Custom JSONB Badges (e.g. Early Adopter)
            if (profileData?.badges && Array.isArray(profileData.badges)) {
                const customBadges = profileData.badges.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    description: b.description || 'Special Badge',
                    icon_url: b.icon === '🎫' ? 'Ticket' : 'Default', // Map emoji/icon to component key if needed
                    isUnlocked: true,
                    unlockedAt: b.awarded_at
                }));

                // Add custom badges to the list (or replace existing placeholder if ID matches)
                enriched = [...customBadges, ...enriched];
            }

            setAchievements(enriched);
            setLoading(false);
        }

        if (userId) fetchBadges();
    }, [userId, supabase]);

    if (loading) return <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading badges...</div>;

    return (

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16, marginTop: 16 }}>
            {achievements.map((badge) => (
                <div
                    key={badge.id}
                    style={{
                        position: 'relative',
                        background: 'rgba(30, 30, 30, 0.6)', // Glass base
                        border: `1px solid ${badge.isUnlocked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: 16,
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        backdropFilter: 'blur(12px)',
                        transition: 'transform 0.2s, background 0.2s',
                        cursor: 'default',
                        // Hover effect handled via CSS class in a real app, strict inline here
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.background = 'rgba(40, 40, 40, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'rgba(30, 30, 30, 0.6)';
                    }}
                >
                    {/* Locked State Overlay / Badge */}
                    {!badge.isUnlocked && (
                        <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.6)',
                            padding: 4,
                            borderRadius: '50%',
                            display: 'flex',
                            color: '#9ca3af'
                        }} title="Locked">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    )}

                    <div style={{
                        color: badge.isUnlocked ? '#f59e0b' : '#6b7280', // Active Orange vs Muted Gray
                        marginBottom: 12,
                        padding: 12,
                        background: badge.isUnlocked ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '50%',
                        fontSize: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56,
                        filter: badge.isUnlocked ? 'none' : 'grayscale(100%)', // Grayscale icon if locked
                        boxShadow: badge.isUnlocked ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none'
                    }}>
                        {badge.icon_url === 'Ticket' ? '🎫' : (IconMap[badge.icon_url || 'Default'] || IconMap['Default'])}
                    </div>

                    <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: badge.isUnlocked ? '#fff' : '#9ca3af',
                        marginBottom: 6,
                        letterSpacing: '-0.01em'
                    }}>
                        {badge.name}
                    </span>

                    <span style={{
                        fontSize: 11,
                        color: '#9ca3af', // Brighter than previous disabled gray
                        lineHeight: 1.4,
                        maxWidth: '100%'
                    }}>
                        {badge.description}
                    </span>
                </div>
            ))}
        </div>
    );
};
