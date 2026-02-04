import React, { useState } from 'react';
import Directory from '../Social/Directory';
import Correspondence from '../Social/Correspondence';
import Notifications from '../Social/Notifications';
import styles from './Dashboard.module.css'; // Reuse container styles if needed

interface CorrespondenceModalProps {
    onClose: () => void;
}

export const CorrespondenceModal: React.FC<CorrespondenceModalProps> = ({ onClose }) => {
    const [tab, setTab] = useState<'directory' | 'messages' | 'notifications'>('messages');

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                width: '900px', height: '80vh',
                background: 'var(--card-bg)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }} onClick={e => e.stopPropagation()}>

                {/* Header / Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--surface)'
                }}>
                    <div
                        onClick={() => setTab('messages')}
                        style={{
                            padding: '16px 24px',
                            cursor: 'pointer',
                            borderBottom: tab === 'messages' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: tab === 'messages' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontFamily: 'var(--font-serif)'
                        }}
                    >
                        Sealed Letters
                    </div>
                    <div
                        onClick={() => setTab('notifications')}
                        style={{
                            padding: '16px 24px',
                            cursor: 'pointer',
                            borderBottom: tab === 'notifications' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: tab === 'notifications' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontFamily: 'var(--font-serif)',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <span>🔔</span> Notifications
                    </div>
                    <div
                        onClick={() => setTab('directory')}
                        style={{
                            padding: '16px 24px',
                            cursor: 'pointer',
                            borderBottom: tab === 'directory' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: tab === 'directory' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontFamily: 'var(--font-serif)'
                        }}
                    >
                        Directory
                    </div>
                    <div style={{ flex: 1 }} />
                    <button onClick={onClose} style={{ padding: '0 20px', background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'hidden', background: '#fcfbf9' }}>
                    {tab === 'messages' && <Correspondence />}
                    {tab === 'notifications' && <Notifications />}
                    {tab === 'directory' && <Directory />}
                </div>

            </div>
        </div>
    );
};
