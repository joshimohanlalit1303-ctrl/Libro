'use client';

import React, { useEffect, useState } from 'react';

interface StreakWarningProps {
    lastActiveDate: string | null; // ISO Date String 'YYYY-MM-DD'
    streakCount: number;
}

export const StreakWarning = ({ lastActiveDate, streakCount }: StreakWarningProps) => {
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        if (!lastActiveDate || streakCount === 0) return;

        // Check if last active date was TODAY
        const checkStreak = () => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            // Logic:
            // If lastActiveDate == Today -> Streak is Safe (Already read today)
            // If lastActiveDate == Yesterday -> Streak is Active BUT At Risk (Must read today)
            // If lastActiveDate < Yesterday -> Streak is Broken (or handled elsewhere, count would reset)

            // We want to warn ONLY if lastActiveDate != today.
            // Assuming the parent passes the current DB state.
            // And assuming 'streakCount' > 0 means they have a streak.

            if (lastActiveDate !== today) {
                // Check if user has dismissed this warning in this session? 
                // Using sessionStorage to show only once per session
                const hasSeen = sessionStorage.getItem('streak_warning_seen');
                if (!hasSeen) {
                    setShowWarning(true);
                    sessionStorage.setItem('streak_warning_seen', 'true');
                }
            }
        };

        checkStreak();
    }, [lastActiveDate, streakCount]);

    if (!showWarning) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: 16,
            padding: 20,
            maxWidth: 320,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: 16 }}>
                <div style={{ fontSize: 32 }}>🔥</div>
                <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: 16, fontWeight: 700 }}>
                        Don't lose your streak!
                    </h3>
                    <p style={{ margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, lineHeight: 1.5 }}>
                        You're on a <b>{streakCount}-day streak</b>. Read any book for a few minutes today to keep it going!
                    </p>
                    <button
                        onClick={() => setShowWarning(false)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#f59e0b',
                            border: 'none',
                            borderRadius: 8,
                            color: '#000',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer'
                        }}
                    >
                        I'll Read Today
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
