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
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ roomId, metadata, participants, ownerName, status, accessCode, onToggleSidebar, isSidebarOpen }) => {
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

    {
        metadata.privacy.type === 'private' && accessCode && (
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
        )
    }

                <button
                    onClick={onToggleSidebar}
                    className={styles.buttonDestructive}
                    style={{ background: isSidebarOpen ? '#f5f5f7' : '#007AFF', color: isSidebarOpen ? '#1d1d1f' : '#fff' }}
                >
                    {isSidebarOpen ? 'Hide Chat' : 'Chat'}
                </button>

                <button className={styles.buttonDestructive} onClick={handleLeave}>Leave</button>
            </div >
        </div >
    );
};
