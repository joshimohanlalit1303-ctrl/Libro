import React, { useState } from 'react';
import { Chat } from './Chat';
import styles from './Sidebar.module.css';
import { PresenceState } from '@/hooks/useRealtime';
import { AnnotationsTab } from './AnnotationsTab';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
    roomId: string;
    presence: PresenceState;
    isOpen?: boolean;
    onClose?: () => void;
    ownerId?: string | null;
    participants: any[]; // Single source of truth
    theme?: 'light' | 'sepia' | 'dark';
}

export const Sidebar: React.FC<SidebarProps> = ({ roomId, presence, isOpen, onClose, ownerId, participants, theme = 'light' }) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'people' | 'notes'>('chat');

    // Use passed participants directly
    const uniqueParticipants = participants;

    console.log("[Sidebar] Count:", uniqueParticipants.length);

    // ... inside component ...
    const { user } = useAuth();
    const router = useRouter();

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
        <>
            <div
                className={`${styles.backdrop} ${isOpen ? styles.active : ''}`}
                onClick={onClose}
            />
            <div
                className={`${styles.container} ${isOpen ? styles.open : ''} ${styles[theme]} ${theme}`}
                style={{
                    // [SAFARI FIX] Force explicit background colors via inline styles to bypass system dark mode overrides
                    background: theme === 'light'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : theme === 'sepia'
                            ? 'rgba(240, 230, 210, 0.95)'
                            : theme === 'dark'
                                ? 'rgba(30, 30, 30, 0.85)' // Dark Mode Glass
                                : undefined
                }}
            >
                <div className={styles.tabs}>
                    <button
                        className={activeTab === 'chat' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('chat')}
                    >
                        Discussion
                    </button>
                    <button
                        className={activeTab === 'notes' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('notes')}
                    >
                        Notes
                    </button>
                    <button
                        className={activeTab === 'people' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('people')}
                    >
                        People ({uniqueParticipants.length})
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'chat' && <Chat channelId={roomId} theme={theme} />}
                    {activeTab === 'notes' && <AnnotationsTab roomId={roomId} />}
                    {activeTab === 'people' && (
                        <div className={styles.peopleList}>
                            {uniqueParticipants.map(p => (
                                <div key={p.user_id} className={styles.person}>
                                    <div className={styles.avatar} style={{ width: 24, height: 24, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>
                                        {/* [EDTECH POLISH] Minimal avatars (Initials) */}
                                        {p.username.substring(0, 1).toUpperCase()}
                                        <span className={styles.onlineDot} style={{ border: '2px solid var(--card-bg)' }} />
                                    </div>
                                    <div className={styles.personInfo}>
                                        <div className={styles.name}>
                                            {p.username}
                                            {ownerId && p.user_id === ownerId && (
                                                <span style={{
                                                    fontSize: 10,
                                                    color: '#007AFF',
                                                    background: 'rgba(0,122,255,0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: 10,
                                                    marginLeft: 6,
                                                    fontWeight: 600
                                                }}>
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.role}>Online</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
