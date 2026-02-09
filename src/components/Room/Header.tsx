import React from 'react';
import { RoomMetadata } from '@/types/room';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

import { PresenceState } from '@/hooks/useRealtime';

import { AppearanceMenu } from '../Reader/AppearanceMenu';
import { MusicMenu, TRACKS } from './MusicMenu';
import { useState, useRef, useEffect } from 'react';
import { SessionSummary } from './SessionSummary';

interface HeaderProps {
    roomId: string;
    metadata: RoomMetadata;
    participants: any[]; // Single source of truth
    ownerName: string | null;
    status: string;
    accessCode: string | null;
    isFocusMode?: boolean;
    onToggleFocusMode?: () => void; // Made optional to prevent errors if not passed

    // Focus Lock Props
    isFocusLocked?: boolean;
    focusLockTime?: number;

    // Appearance Props
    showAppearanceMenu: boolean;
    setShowAppearanceMenu: (show: boolean) => void;
    theme: 'light' | 'sepia' | 'dark';
    setTheme: (t: 'light' | 'sepia' | 'dark') => void;
    fontFamily: 'sans' | 'serif' | 'dyslexic';
    setFontFamily: (f: 'sans' | 'serif' | 'dyslexic') => void;
    fontSize: number;
    setFontSize: (s: number | ((prev: number) => number)) => void;
    // Accessibility
    onToggleTTS?: () => void;
    onSummarize?: () => void; // [FIX] Add missing prop definition
}

export const Header: React.FC<HeaderProps> = ({
    roomId, metadata, participants, ownerName, status, accessCode, onToggleFocusMode, isFocusMode,
    isFocusLocked, focusLockTime,
    showAppearanceMenu, setShowAppearanceMenu, theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize,
    onToggleTTS, onSummarize // [FIX] Destructure
}) => {
    const { user } = useAuth();
    const router = useRouter();

    const activeUsers = participants.length;

    // Music State
    const [showMusicMenu, setShowMusicMenu] = useState(false);
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
    const [volume, setVolume] = useState(0.5);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Session Summary State
    const [showSummary, setShowSummary] = useState(false);

    // Focus Timer State
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // [EDTECH POLISH] Load Intention
    const [intention, setIntention] = useState<string | null>(null);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIntention(sessionStorage.getItem('session_intention'));
        }
    }, []);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    // Audio Logic
    useEffect(() => {
        if (!audioRef.current) return;

        if (currentTrackId) {
            const track = TRACKS.find(t => t.id === currentTrackId);
            if (track && track.url) {
                if (audioRef.current.src !== track.url) {
                    audioRef.current.src = track.url;
                    audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                } else {
                    audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                }
            }
        } else {
            audioRef.current.pause();
        }
    }, [currentTrackId]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const handleLeave = async () => {
        // Stop music if playing
        if (audioRef.current) audioRef.current.pause();

        // Show Summary
        setShowSummary(true);
    };

    const confirmLeave = async () => {
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
            {showSummary && (
                <SessionSummary
                    durationSeconds={elapsedSeconds}
                    intention={typeof window !== 'undefined' ? sessionStorage.getItem('session_intention') || undefined : undefined}
                    onClose={confirmLeave}
                    onDismiss={() => setShowSummary(false)} // [NEW] Allow user to cancel
                />
            )}

            {/* [NEW] Focus Glow Definitions (Pulse Animation) */}
            <style jsx>{`
                @keyframes pulse-yellow {
                    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
                }
                .active-focus-glow {
                    animation: pulse-yellow 2s infinite;
                    border: 2px solid #f59e0b !important;
                }
            `}</style>

            {/* Header Layout */}
            <div className={styles.left}>
                {/* Mobile Back Button */}
                <button
                    className={styles.mobileBack}
                    onClick={handleLeave}
                    aria-label="Back to Dashboard"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>

                <span className={`${styles.logo} ${styles.mobileHidden}`}>Libro</span>
                <div className={styles.titleWrapper}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <h1 className={styles.title}>{metadata.room_name}</h1>

                            {/* [EDTECH POLISH] Session Intention Badge */}
                            {intention && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: 100, padding: '4px 12px', height: 24
                                }} className={styles.mobileHidden}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }}></span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', lineHeight: 1 }}>{intention}</span>
                                </div>
                            )}
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
                    <span className={styles.mobileHidden} style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>
                        {status === 'SUBSCRIBED' ? 'Live' : status}
                    </span>
                    <div style={{ width: 1, height: 12, background: '#ddd', margin: '0 4px' }} className={styles.mobileHidden}></div>
                    <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#333', fontWeight: 600 }}>
                        {formatTime(elapsedSeconds)}
                    </span>
                </div>
                <div className={styles.participants} style={{ fontSize: 13, color: '#666', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {activeUsers} active
                    </div>

                    {/* [NEW] Individual Focus Indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {participants.map((p, idx) => (
                            <div
                                key={p.user_id || idx}
                                className={`${styles.participantWithGlow} ${p.is_focusing ? 'active-focus-glow' : ''}`}
                                style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: '#eee', border: '1px solid #ddd',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                                    zIndex: 10 - idx
                                }}
                                title={`${p.username} ${p.is_focusing ? '(Focusing)' : ''}`}
                            >
                                {p.username?.charAt(0).toUpperCase()}
                                {p.is_focusing && <div className={styles.focusTag}></div>}
                            </div>
                        ))}
                    </div>

                    {/* [NEW] Focus Collective Indicator */}
                    {participants.filter(p => p.is_focusing).length > 0 && (
                        <div className={styles.focusCollective}>
                            <div className={styles.focusGlow}></div>
                            <span>Collective Focus</span>
                        </div>
                    )}
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

                {/* Read Aloud Button (Target 4.a) */}
                <button
                    onClick={onToggleTTS}
                    title="Read Aloud"
                    className={styles.iconButton}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6L8 10H4V14H8L12 18V6Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                </button>

                {/* Focus Mode Button */}
                <button
                    onClick={onToggleFocusMode}
                    title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                    className={`${styles.iconButton} ${isFocusMode ? styles.iconButtonActive : ''}`}
                >
                    {isFocusMode ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                    )}
                </button>

                {/* Music Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowMusicMenu(!showMusicMenu);
                            if (!showMusicMenu) setShowAppearanceMenu(false);
                        }}
                        title="Ambient Music"
                        className={`${styles.iconButton} ${showMusicMenu || currentTrackId ? styles.iconButtonActive : ''}`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    </button>

                    {showMusicMenu && (
                        <div style={{ position: 'absolute', top: 48, right: 0, zIndex: 2000 }}>
                            <MusicMenu
                                currentTrackId={currentTrackId}
                                onSelectTrack={setCurrentTrackId}
                                onClose={() => setShowMusicMenu(false)}
                            />
                        </div>
                    )}
                </div>

                {/* Hidden Audio Player */}
                <audio ref={audioRef} loop />

                {/* Appearance Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            setShowAppearanceMenu(!showAppearanceMenu);
                            if (!showAppearanceMenu) setShowMusicMenu(false);
                        }}
                        className={`${styles.iconButton} ${showAppearanceMenu ? styles.iconButtonActive : ''}`}
                        style={{ fontSize: 15, fontWeight: 500 }}
                    >
                        Aa
                    </button>

                    {showAppearanceMenu && (
                        <div style={{ position: 'absolute', top: 48, right: 0, zIndex: 2000 }}>
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

                {/* Invite/Share Button */}
                <button
                    onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url).then(() => {
                            const btn = document.getElementById('share-btn-text');
                            if (btn) btn.innerText = "Copied!";
                            setTimeout(() => { if (btn) btn.innerText = "Share"; }, 2000);
                        });
                    }}
                    title="Copy Invitation Link"
                    className={styles.sharePill}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    <span id="share-btn-text" className={styles.mobileHidden}>Share</span>
                </button>

                {isFocusLocked && focusLockTime ? (
                    <button
                        className={styles.leavePill}
                        style={{ background: '#f5f5f7', color: '#888', borderColor: '#e5e5ea', cursor: 'not-allowed', width: 90 }}
                        title="Focus Session Active - Cannot Leave"
                    >
                        🔒 {Math.floor(focusLockTime / 60)}:{(focusLockTime % 60).toString().padStart(2, '0')}
                    </button>
                ) : (
                    <button
                        className={styles.leavePill}
                        onClick={handleLeave}
                    >
                        Leave
                    </button>
                )}
            </div>
        </div>
    );
};
