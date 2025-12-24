import React from 'react';
import { RoomMetadata } from '@/types/room';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

import { PresenceState } from '@/hooks/useRealtime';

import { AppearanceMenu } from '../Reader/AppearanceMenu';

interface HeaderProps {
    roomId: string;
    metadata: RoomMetadata;
    participants: any[]; // Single source of truth
    ownerName: string | null;
    status: string;
    accessCode: string | null;
    isFocusMode?: boolean;
    onToggleFocusMode?: () => void;

    // Appearance Props
    showAppearanceMenu: boolean;
    setShowAppearanceMenu: (show: boolean) => void;
    theme: 'light' | 'sepia';
    setTheme: (t: 'light' | 'sepia') => void;
    fontFamily: 'sans' | 'serif';
    setFontFamily: (f: 'sans' | 'serif') => void;
    fontSize: number;
    setFontSize: (s: number | ((prev: number) => number)) => void;
}

export const Header: React.FC<HeaderProps> = ({
    roomId, metadata, participants, ownerName, status, accessCode, onToggleFocusMode, isFocusMode,
    showAppearanceMenu, setShowAppearanceMenu, theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize
}) => {
    const { user } = useAuth();
    const router = useRouter();

    const activeUsers = participants.length;

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave this room?")) return;

        try {
            if (user) {
                await supabase.from('participants')
                    .delete()
                    .match({ room_id: roomId, user_id: user.id });
            }
            router.push('/dashboard');
        } catch (error) {
            console.error("Error leaving room:", error);
            router.push('/dashboard');
        }
    };

    return (
        <div className={styles.container}>
            {/* Header Layout */}
            <div className={styles.left}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#0071E3', marginRight: 16 }}>Libro</span>
                <div className={styles.titleWrapper}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h1 className={styles.title}>{metadata.room_name}</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.right} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: status === 'SUBSCRIBED' ? '#4CAF50' : (status === 'CONNECTING' ? '#FFC107' : '#F44336')
                    }} />
                    <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>
                        {status === 'SUBSCRIBED' ? 'Live' : status}
                    </span>
                </div>
                <div className={styles.participants} style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>
                    {activeUsers} active
                </div>

                {metadata.privacy.type === 'private' && accessCode && (
                    <div style={{
                        background: '#f5f5f7',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: '#666',
                        border: '1px solid #e5e5ea',
                    }}>
                        Code: <strong>{accessCode}</strong>
                    </div>
                )}

                {/* Focus Mode Button - Restored for Visibility */}
                <button
                    onClick={onToggleFocusMode}
                    title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: isFocusMode ? '#007AFF' : 'transparent',
                        color: isFocusMode ? '#fff' : '#333',
                        border: '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { if (!isFocusMode) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                    onMouseOut={(e) => { if (!isFocusMode) e.currentTarget.style.background = 'transparent'; }}
                >
                    {isFocusMode ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                    )}
                </button>

                {/* Appearance Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
                        style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: showAppearanceMenu ? '#007AFF' : '#f5f5f7',
                            color: showAppearanceMenu ? '#fff' : '#333',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 500, fontSize: 14,
                            transition: 'all 0.2s'
                        }}
                    >
                        Aa
                    </button>

                    {showAppearanceMenu && (
                        <div style={{ position: 'absolute', top: 44, right: 0, zIndex: 2000 }}>
                            <AppearanceMenu
                                theme={theme} setTheme={setTheme}
                                fontFamily={fontFamily} setFontFamily={setFontFamily}
                                fontSize={fontSize} setFontSize={setFontSize}
                                isFocusMode={!!isFocusMode}
                                onToggleFocusMode={onToggleFocusMode || (() => { })}
                            />
                        </div>
                    )}
                </div>

                <button
                    className={styles.buttonDestructive}
                    onClick={handleLeave}
                    style={{ fontSize: 13, padding: '6px 12px', height: 32, display: 'flex', alignItems: 'center' }}
                >
                    Leave
                </button>
            </div>
        </div>
    );
};
