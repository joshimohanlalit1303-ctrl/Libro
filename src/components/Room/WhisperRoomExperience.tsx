"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './WhisperRoom.module.css';
import { Reader, ReaderHandle } from '../Reader/Reader';
import { Header } from './Header';
import { useRealtime, PresenceState } from '@/hooks/useRealtime';
import { useAudioWebRTC } from '@/hooks/useAudioWebRTC';
import { supabase } from '@/lib/supabase';

interface WhisperRoomExperienceProps {
    roomId: string;
    roomName: string;
    user: any;
    isHost: boolean;
    ownerName: string | null;
    status: string;
    participants: any[];
    presence: PresenceState;
    updateMicStatus: (on: boolean) => Promise<void>;
    updateSpeakingStatus: (on: boolean) => Promise<void>;
    channel: any; // Added
    onToggleFocusMode: () => void;
    isFocusMode: boolean;
    theme: any;
    setTheme: any;
    fontFamily: any;
    setFontFamily: any;
    fontSize: any;
    setFontSize: any;
    accessCode: string | null;
}

export const WhisperRoomExperience: React.FC<WhisperRoomExperienceProps> = ({
    roomId, roomName, user, isHost, ownerName, status, participants, presence,
    updateMicStatus, updateSpeakingStatus, channel, onToggleFocusMode, isFocusMode,
    theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, accessCode
}) => {
    const [isMicOn, setIsMicOn] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showAiMenu, setShowAiMenu] = useState(false);
    const [showCandleRitual, setShowCandleRitual] = useState(true);
    const readerRef = useRef<ReaderHandle>(null);
    const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    // Identify Peer
    const peer = participants.find(p => p.user_id !== user.id);
    const peerId = peer?.user_id;

    // WebRTC Audio
    const { remoteStream, connectionState } = useAudioWebRTC(
        channel,
        user.id,
        roomId,
        isHost,
        peerId,
        isMicOn
    );

    useEffect(() => {
        if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(e => console.error("[WebRTC] Auto-play failed:", e));
        }
    }, [remoteStream]);

    // Initial Ritual
    useEffect(() => {
        const timer = setTimeout(() => setShowCandleRitual(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    // Ambient Sound
    useEffect(() => {
        if (!ambientAudioRef.current) {
            ambientAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-fire-crackling-loop-3031.mp3');
            ambientAudioRef.current.loop = true;
            ambientAudioRef.current.volume = 0.15;
        }

        ambientAudioRef.current.play().catch(e => console.warn("Ambient sound blocked", e));

        return () => {
            ambientAudioRef.current?.pause();
        };
    }, []);

    const handlePTTStart = () => {
        setIsMicOn(true);
        setIsSpeaking(true);
        updateMicStatus(true);
        updateSpeakingStatus(true);
        // In a real app, we would start recording/streaming here
    };

    const handlePTTEnd = () => {
        setIsMicOn(false);
        setIsSpeaking(false);
        updateMicStatus(false);
        updateSpeakingStatus(false);
    };

    // Filter to exactly two participants for the symmetrical view
    const duo = participants.slice(0, 2);
    const me = duo.find(p => p.user_id === user?.id) || { username: user?.user_metadata?.username || 'Me' };

    return (
        <div className={styles.whisperContainer}>
            {/* Candle Lighting Ritual Overlay */}
            <div className={`${styles.overlay} ${showCandleRitual ? styles.active : ''}`}>
                <div className={styles.ritualContent}>
                    <p style={{ fontFamily: 'var(--font-playfair)', color: '#f6f1e7', fontSize: '1.2rem', fontStyle: 'italic' }}>
                        "Two minds. One book. A quiet place to listen and be heard."
                    </p>
                </div>
            </div>

            <header className={styles.whisperHeader}>
                <h1>{roomName} — A Quiet Dialogue</h1>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#8b6f47' }}>{status === 'SUBSCRIBED' ? '🪔 Sanctuary Connected' : 'Seeking connection...'}</div>
                    {isHost && accessCode && (
                        <div
                            style={{ fontSize: '0.9rem', opacity: 0.6, cursor: 'pointer', borderBottom: '1px dashed currentColor' }}
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Room link copied to clipboard!");
                            }}
                        >
                            Invite Code: {accessCode} (Copy Link)
                        </div>
                    )}
                    <button onClick={() => window.location.href = '/dashboard'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', borderBottom: '1px solid currentColor' }}>Leave</button>
                </div>
            </header>

            <main className={styles.mainStage}>
                {/* Left Participant (Me or Host) */}
                <div className={styles.participantCard}>
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me.user_id || 'me'}`}
                        className={styles.avatar}
                        alt="me"
                    />
                    <div style={{ fontWeight: 600 }}>{me.username}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <div className={`${styles.speakingIndicator} ${isSpeaking ? styles.active : ''}`}>
                            {isSpeaking ? 'Speaking...' : 'Listening'}
                        </div>
                        <div style={{
                            fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
                            color: connectionState === 'connected' ? '#4CAF50' :
                                connectionState === 'connecting' ? '#FF9800' :
                                    connectionState === 'failed' ? '#F44336' : '#8b6f47',
                            opacity: 0.8
                        }}>
                            {connectionState === 'connected' ? '● Securely Linked' :
                                connectionState === 'connecting' ? '○ Connecting...' :
                                    connectionState === 'failed' ? '⚠ Connection Failed' : '○ Initializing'}
                        </div>
                    </div>
                </div>

                {/* Center Book Animation / Reader Integration */}
                <div className={styles.centerBook} onClick={() => onToggleFocusMode()}>
                    <div style={{
                        width: '100%', height: '100%',
                        background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                        borderRadius: 8, overflow: 'hidden', border: '1px solid #d8cfc2',
                        transform: 'rotateY(-5deg)', transformStyle: 'preserve-3d'
                    }}>
                        {!isFocusMode && (
                            <div style={{ padding: 40, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 2, color: '#8b6f47', marginBottom: 20 }}>Currently Reading</div>
                                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.8rem', margin: '0 0 10px 0' }}>{roomName}</h2>
                                <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>A shared journey through words.</p>
                                <button className={styles.enterBtn} style={{ marginTop: 30, padding: '10px 24px', background: '#2c2a26', color: '#f6f1e7', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Enter Sanctuary</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Participant (Peer) */}
                <div className={styles.participantCard}>
                    {peer ? (
                        <>
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${peer.user_id}`}
                                className={styles.avatar}
                                alt="peer"
                            />
                            <div style={{ fontWeight: 600 }}>{peer.username}</div>
                            <div className={`${styles.speakingIndicator} ${peer.is_speaking ? styles.active : ''}`}>Whispering...</div>
                        </>
                    ) : (
                        <div style={{ opacity: 0.3, textAlign: 'center' }}>
                            <div className={styles.avatar} style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
                            <div style={{ marginTop: 10 }}>Waiting for partner...</div>
                        </div>
                    )}
                </div>
            </main>

            {isFocusMode && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#f6f1e7' }}>
                    <Reader
                        roomId={roomId}
                        isHost={isHost}
                        username={user?.user_metadata?.username || 'Guest'}
                        isFocusMode={true}
                        theme={theme}
                        setTheme={setTheme}
                        fontFamily={fontFamily}
                        setFontFamily={setFontFamily}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                        toggleFocusMode={() => { }} // Controlled by room view
                        showAppearanceMenu={showAppearance}
                        setShowAppearanceMenu={setShowAppearance}
                        roomType="whisper"
                    />

                    {/* Floating PTT in Sanctuary */}
                    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '0.7rem', color: '#8b6f47', fontStyle: 'italic', background: 'rgba(246, 241, 231, 0.8)', padding: '2px 8px', borderRadius: 10 }}>Hold to Whisper</div>
                        <button
                            onMouseDown={handlePTTStart}
                            onMouseUp={handlePTTEnd}
                            onTouchStart={handlePTTStart}
                            onTouchEnd={handlePTTEnd}
                            style={{
                                width: 56, height: 56, borderRadius: '50%', background: isSpeaking ? '#8b6f47' : '#2c2a26',
                                border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'all 0.2s'
                            }}
                        >
                            🎙️
                        </button>
                    </div>

                    <button
                        onClick={onToggleFocusMode}
                        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, background: '#2c2a26', color: '#f6f1e7', padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Exit Sanctuary
                    </button>

                    {/* [NEW] AI Sanctuary Menu */}
                    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                        <button
                            onClick={() => setShowAiMenu(!showAiMenu)}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid #e0d8c0',
                                fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            ✨
                        </button>

                        {showAiMenu && (
                            <div style={{
                                background: '#fff', borderRadius: 12, padding: 8, border: '1px solid #e0d8c0',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 160, display: 'flex', flexDirection: 'column', gap: 4
                            }}>
                                <button
                                    onClick={() => { readerRef.current?.summarizePage(); setShowAiMenu(false); }}
                                    style={{ background: 'none', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', borderRadius: 6, transition: 'background 0.2s', color: '#4a4a4a' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f6f1e7'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    📄 Summarize Page
                                </button>
                                <button
                                    onClick={() => { readerRef.current?.summarizeChapter(); setShowAiMenu(false); }}
                                    style={{ background: 'none', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', borderRadius: 6, transition: 'background 0.2s', color: '#4a4a4a' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f6f1e7'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    📚 Summarize Chapter
                                </button>
                                <button
                                    onClick={() => { readerRef.current?.summarizeKnowledge(); setShowAiMenu(false); }}
                                    style={{ border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', borderRadius: 6, transition: 'background 0.2s', color: '#764ba2', background: 'rgba(118, 75, 162, 0.05)', fontWeight: 600 }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(118, 75, 162, 0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(118, 75, 162, 0.05)'}
                                >
                                    🧠 Literary Wisdom
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.controls}>
                <div className={styles.pttPrompt}>Hold to Whisper</div>
                <button
                    className={styles.pttButton}
                    onMouseDown={handlePTTStart}
                    onMouseUp={handlePTTEnd}
                    onTouchStart={handlePTTStart}
                    onTouchEnd={handlePTTEnd}
                >
                    🎙️
                </button>
            </div>

            {/* Remote Audio Playback */}
            <audio ref={remoteAudioRef} autoPlay />
        </div>
    );
};
