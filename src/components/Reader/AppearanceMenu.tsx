import React from 'react';

interface AppearanceMenuProps {
    theme: 'light' | 'sepia' | 'dark';
    setTheme: (theme: 'light' | 'sepia' | 'dark') => void;
    fontFamily: 'sans' | 'serif';
    setFontFamily: (font: 'sans' | 'serif') => void;
    fontSize: number;
    setFontSize: (size: number | ((prev: number) => number)) => void;
    isFocusMode: boolean;
    onToggleFocusMode: () => void;

    // Focus Timer Props (Optional - mainly for Reader usage)
    isFocusSessionActive?: boolean;
    focusTimeRemaining?: number;
    onStartFocusSession?: (minutes: number) => void;
    onStopFocusSession?: () => void;

    // Optional styling override
    style?: React.CSSProperties;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({
    theme, setTheme,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    isFocusMode, onToggleFocusMode,
    isFocusSessionActive, focusTimeRemaining, onStartFocusSession, onStopFocusSession,
    style
}) => {
    return (
        <div style={{
            width: 260, padding: 16, borderRadius: 12,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            color: '#000',
            display: 'flex', flexDirection: 'column', gap: 16,
            zIndex: 10001,
            ...style
        }}>
            {/* Themes */}
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['light', 'sepia', 'dark'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 8,
                                border: theme === t ? `2px solid #007AFF` : '1px solid #e0e0e0',
                                background: t === 'light' ? '#fff' : t === 'sepia' ? '#f6f1d1' : '#1a1a1a',
                                color: t === 'dark' ? '#fff' : '#000',
                                cursor: 'pointer',
                                fontSize: 12
                            }}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fonts */}
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Font</div>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 2, borderRadius: 8, gap: 2 }}>
                    <button
                        onClick={() => setFontFamily('sans')}
                        style={{
                            flex: 1, padding: '6px 0', borderRadius: 6,
                            background: fontFamily === 'sans' ? '#fff' : 'transparent',
                            color: '#000',
                            border: 'none', cursor: 'pointer', boxShadow: fontFamily === 'sans' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Sans
                    </button>
                    <button
                        onClick={() => setFontFamily('serif')}
                        style={{
                            flex: 1, padding: '6px 0', borderRadius: 6,
                            fontFamily: 'serif',
                            background: fontFamily === 'serif' ? '#fff' : 'transparent',
                            color: '#000',
                            border: 'none', cursor: 'pointer', boxShadow: fontFamily === 'serif' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        Serif
                    </button>

                </div>
            </div>


            {(onStartFocusSession && onStopFocusSession) && (
                <hr style={{ border: 0, borderTop: '1px solid rgba(128,128,128,0.2)', width: '100%', margin: 0 }} />
            )}

            {/* Focus / Timer Section */}
            {(onStartFocusSession && onStopFocusSession) && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Focus Timer {isFocusSessionActive && '🔒'}
                    </div>

                    {isFocusSessionActive && focusTimeRemaining !== undefined ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{
                                fontSize: 24, fontWeight: 700, textAlign: 'center',
                                fontVariantNumeric: 'tabular-nums', letterSpacing: -1,
                                color: '#007AFF'
                            }}>
                                {Math.floor(focusTimeRemaining / 60)}:{(focusTimeRemaining % 60).toString().padStart(2, '0')}
                            </div>
                            <button
                                onClick={onStopFocusSession}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: 8,
                                    background: 'rgba(255, 59, 48, 0.1)',
                                    color: '#FF3B30',
                                    border: '1px solid rgba(255, 59, 48, 0.2)',
                                    cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Stop Session
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[15, 30, 45, 60].map(min => (
                                <button
                                    key={min}
                                    onClick={() => onStartFocusSession && onStartFocusSession(min)}
                                    style={{
                                        flex: 1, padding: '8px 0', borderRadius: 8,
                                        background: 'rgba(0,122,255,0.05)',
                                        color: '#007AFF',
                                        border: 'none', cursor: 'pointer',
                                        fontWeight: 600, fontSize: 12
                                    }}
                                >
                                    {min}m
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {(onStartFocusSession && onStopFocusSession) && (
                <hr style={{ border: 0, borderTop: '1px solid rgba(128,128,128,0.2)', width: '100%', margin: 0 }} />
            )}

            {/* Manual Toggle (Secondary) */}
            <button
                onClick={onToggleFocusMode}
                style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: isFocusMode ? '#000' : 'rgba(0,0,0,0.05)',
                    color: isFocusMode ? '#fff' : 'inherit',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
            >
                <span>{isFocusMode ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
            </button>
        </div>
    );
};
