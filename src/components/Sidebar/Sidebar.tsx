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
}

export const Sidebar: React.FC<SidebarProps> = ({ roomId, presence, isOpen, onClose, ownerId }) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'people' | 'notes'>('chat');

    // ... (rest of code)

    // Inside render, find the people mapping loop:


    // Flatten presence state to a list of unique users
    const uniqueParticipants = Object.values(presence)
        .flat()
        .filter(p => p.user_id && p.user_id !== 'undefined')
        .reduce((acc: any[], curr) => {
            if (!acc.find(p => p.user_id === curr.user_id)) {
                acc.push(curr);
            }
            return acc;
        }, []);

    console.log("[Sidebar] Count:", uniqueParticipants.length, "IDs:", uniqueParticipants.map(p => p.user_id));

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
            <div className={`${styles.container} ${isOpen ? styles.open : ''}`}>
                <div className={styles.tabs}>
                    <button
                        className={activeTab === 'chat' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('chat')}
                    >
                        Chat
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
                    {activeTab === 'chat' && <Chat channelId={roomId} />}
                    {activeTab === 'notes' && <AnnotationsTab roomId={roomId} />}
                    {activeTab === 'people' && (
                        <div className={styles.peopleList}>
                            {uniqueParticipants.map(p => (
                                <div key={p.user_id} className={styles.person}>
                                    <div className={styles.avatar}>
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                                            alt={p.username}
                                            width={32}
                                            height={32}
                                        />
                                        <span className={styles.onlineDot} />
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
