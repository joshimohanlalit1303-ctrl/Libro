import React from 'react';

interface AppearanceMenuProps {
    theme: 'light' | 'sepia' | 'dark';
    setTheme: (theme: 'light' | 'sepia' | 'dark') => void;
    fontFamily: 'sans' | 'serif' | 'dyslexic';
    setFontFamily: (font: 'sans' | 'serif' | 'dyslexic') => void;
    fontSize: number;
    setFontSize: (size: number | ((prev: number) => number)) => void;
    isFocusMode: boolean;
    onToggleFocusMode: () => void;

    // Focus Timer Props (Optional - mainly for Reader usage)
    isFocusSessionActive?: boolean;
    focusTimeRemaining?: number;
    onStartFocusSession?: (minutes: number) => void;
    onStopFocusSession?: () => void;

    // [NEW] AI Summary
    onSummarize?: () => void;

    // Optional styling override
    style?: React.CSSProperties;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({
    theme, setTheme,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    isFocusMode, onToggleFocusMode,
    isFocusSessionActive, focusTimeRemaining, onStartFocusSession, onStopFocusSession,
    // [NEW]
    onSummarize,
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
                    {(['light', 'sepia'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 8,
                                border: theme === t ? `2px solid #007AFF` : '1px solid #e0e0e0',
                                background: t === 'light' ? '#fff' : '#f6f1d1',
                                color: '#000',
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
                    <button
                        onClick={() => setFontFamily('dyslexic' as any)}
                        style={{
                            flex: 1, padding: '6px 0', borderRadius: 6,
                            fontFamily: '"OpenDyslexic", "Comic Sans MS", sans-serif',
                            background: fontFamily === 'dyslexic' as any ? '#fff' : 'transparent',
                            color: '#000',
                            border: 'none', cursor: 'pointer', boxShadow: fontFamily === 'dyslexic' as any ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            fontSize: 11
                        }}
                    >
                        Dyslexic
                    </button>
                </div>
            </div>




            {/* AI Summary Button */}
            {onSummarize && (
                <div>
                    <hr style={{ border: 0, borderTop: '1px solid rgba(128,128,128,0.1)', margin: '12px 0' }} />
                    <button
                        onClick={onSummarize}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                            boxShadow: '0 2px 8px rgba(118, 75, 162, 0.3)'
                        }}
                    >
                        <span>✨</span> Summarize Chapter
                    </button>
                </div>
            )}
        </div>
    );
};
