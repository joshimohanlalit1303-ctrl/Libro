// @ts-nocheck
import React from 'react';
import { RoomMetadata } from '@/types/room';
import styles from './Header.module.css';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

import { PresenceState } from '@/hooks/useRealtime';

interface HeaderProps {
    roomId: string;
    metadata: RoomMetadata;
    participants: any[]; // Single source of truth
    ownerName: string | null;
    status: string;
    accessCode: string | null;
    onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ roomId, metadata, participants, ownerName, status, accessCode, onToggleSidebar }) => {
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
            <div className={styles.left}>
                {/* Force text rendering with inline styles to prevent any "grey box" background issues */}
                <span style={{ fontSize: 20, fontWeight: 700, color: '#0071E3', marginRight: 16 }}>Libro</span>
                <div className={styles.titleWrapper}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h1 className={styles.title}>{metadata.room_name}</h1>
                        </div>

                    </div>
                </div>
            </div>

            <div className={styles.right}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: status === 'SUBSCRIBED' ? '#4CAF50' : (status === 'CONNECTING' ? '#FFC107' : '#F44336')
                    }} />
                    <span style={{ fontSize: 10, color: '#888' }}>
                        {status === 'SUBSCRIBED' ? 'Live' : status}
                    </span>
                </div>
                <div className={styles.participants}>
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
                        marginRight: 8
                    }}>
                        Code: <strong>{accessCode}</strong>
                    </div>
                )}

                <button className={styles.buttonDestructive} onClick={handleLeave}>Leave</button>
            </div>
        </div>
    );
};
