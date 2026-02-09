import React, { useState, useEffect } from 'react';
import { Highlight, HighlightReaction } from '@/hooks/useHighlights';
import { useAuth } from '@/context/AuthContext';

interface HighlightMenuProps {
    mode: 'create' | 'view';
    rect: DOMRect;
    onClose: () => void;
    // Create props
    onCreate?: (color: string) => void;
    onDefine?: () => void;
    onTransmute?: () => void;
    // View props
    highlight?: Highlight;
    onDelete?: (id: string) => void;
    onReact?: (id: string, emoji: string) => void;
    onRemoveReact?: (id: string, emoji: string) => void;
    user?: any; // To check if user owns the highlight
    roomType?: 'standard' | 'whisper';
}

const COLORS = [
    { name: 'Yellow', value: '#fef3c7' }, // slate-50/yellow-100 logic
    { name: 'Green', value: '#d1fae5' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Pink', value: '#fbcfe8' },
    { name: 'Purple', value: '#e9d5ff' },
    { name: 'Red', value: '#fecaca' },
    { name: 'Orange', value: '#fed7aa' }
];

const EMOJIS = ['❤️', '🔥', '💡', '🤔', '😂'];

export const HighlightMenu: React.FC<HighlightMenuProps> = ({
    mode, rect, onClose, onCreate, onDefine, onTransmute, highlight, onDelete, onReact, onRemoveReact, roomType
}) => {
    const { user } = useAuth();

    // Position calculation to keep it on screen
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        // Calculate position relative to viewport
        // We want it centered above the selection (rect)
        let top = rect.top - 60; // 60px above
        let left = rect.left + rect.width / 2;

        // Clamp to screen?
        if (top < 10) top = rect.bottom + 10; // Flip to bottom if too high

        setStyle({
            position: 'fixed',
            top: top,
            left: left,
            transform: 'translateX(-50%)',
            zIndex: 3000, // Above everything
        });
    }, [rect]);

    // Click outside to close requires a global listener or backdrop.
    // For now, let's just make a simple card.

    // We can use a backdrop div for closing.
    return (
        <>
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 2999 }}
                onClick={onClose}
            />
            <div
                className="highlight-menu" // Could use CSS module
                style={{
                    ...style,
                    backgroundColor: roomType === 'whisper' ? '#f6f1e7' : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    padding: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    border: roomType === 'whisper' ? '1px solid #d8cfc2' : '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    gap: '8px',
                    minWidth: mode === 'view' ? '200px' : 'auto',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out',
                    fontFamily: roomType === 'whisper' ? "'Cormorant Garamond', serif" : 'inherit'
                }}
            >
                <style jsx>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translate(-50%, 10px); }
                        to { opacity: 1; transform: translate(-50%, 0); }
                    }
                    button {
                        border: none;
                        cursor: pointer;
                        transition: transform 0.1s;
                    }
                    button:active { transform: scale(0.95); }
                `}</style>

                {mode === 'create' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => onCreate?.(roomType === 'whisper' ? 'ink' : '#fef3c7')} // Always Yellow
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                backgroundColor: roomType === 'whisper' ? '#2c2a26' : '#fff',
                                color: roomType === 'whisper' ? '#f6f1e7' : 'inherit',
                                border: '1px solid rgba(0,0,0,0.1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18,
                                transition: 'transform 0.1s'
                            }}
                            title={roomType === 'whisper' ? "Handwritten Ink" : "Highlight"}
                        >
                            {roomType === 'whisper' ? '🖋️' : '✏️'}
                        </button>
                        {onDefine && (
                            <button
                                onClick={onDefine}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18,
                                    transition: 'transform 0.1s'
                                }}
                                title="Define"
                            >
                                📖
                            </button>
                        )}
                        {onTransmute && (
                            <button
                                onClick={onTransmute}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    border: '1px solid rgba(118, 75, 162, 0.2)',
                                    boxShadow: '0 2px 8px rgba(118, 75, 162, 0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18,
                                    transition: 'transform 0.1s'
                                }}
                                title="Transmute"
                            >
                                🧪
                            </button>
                        )}
                    </div>
                )}

                {mode === 'view' && highlight && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* User Info */}
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                            Highlighted by <strong>{
                                (() => {
                                    // Handle singular or array result from Supabase join
                                    const p = highlight.profiles;
                                    const name = Array.isArray(p) ? p[0]?.username : p?.username;
                                    return name || 'User';
                                })()
                            }</strong>
                        </div>

                        {/* Reactions */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {EMOJIS.map(emoji => {
                                const count = highlight.reactions?.filter(r => r.emoji === emoji).length || 0;
                                const hasReacted = highlight.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);

                                return (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            if (hasReacted) {
                                                onRemoveReact?.(highlight.id, emoji);
                                            } else {
                                                onReact?.(highlight.id, emoji);
                                            }
                                        }}
                                        style={{
                                            background: hasReacted ? 'rgba(0,0,0,0.1)' : 'transparent',
                                            borderRadius: 12,
                                            padding: '2px 6px',
                                            fontSize: 14,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2
                                        }}
                                    >
                                        {emoji} {count > 0 && <span style={{ fontSize: 10 }}>{count}</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Delete (if owner) */}
                        {user?.id === highlight.user_id && (
                            <button
                                onClick={() => onDelete?.(highlight.id)}
                                style={{
                                    marginTop: 4, fontSize: 12, color: '#ef4444', background: 'transparent',
                                    padding: 4, textAlign: 'left'
                                }}
                            >
                                Delete Highlight
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
