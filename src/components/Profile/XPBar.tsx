import React from 'react';
import styles from '@/app/profile/Profile.module.css';

interface XPBarProps {
    xp: number;
    level: number;
}

export const XPBar: React.FC<XPBarProps> = ({ xp, level }) => {
    // Simple progression: Level N requires N*100 XP total? 
    // Or simpler: Level up every 100 XP for now to make it easy to verify.
    // Let's us a curve: XP needed for next level = (Level) * 100.
    // e.g. Level 1 -> 2 needs 100 XP. Level 2 -> 3 needs 200 XP.
    // Wait, total XP is stored. 
    // Let's stick to a linear curve for MVP: Level = floor(XP / 100) + 1.
    // So 0-99 XP = Lvl 1. 100-199 XP = Lvl 2.

    const xpPerLevel = 100;
    const currentLevelXP = xp % xpPerLevel;
    const progress = (currentLevelXP / xpPerLevel) * 100;

    return (
        <div style={{ margin: '20px 0', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>
                <span>Level {level}</span>
                <span>{currentLevelXP} / {xpPerLevel} XP</span>
            </div>

            <div style={{
                height: 8,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', // Gold/Amber
                    borderRadius: 4,
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)'
                }} />
            </div>

            <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                Read more to level up!
            </p>
        </div>
    );
};
