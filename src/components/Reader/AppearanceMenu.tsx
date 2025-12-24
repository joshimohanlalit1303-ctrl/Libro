import React from 'react';

interface AppearanceMenuProps {
    theme: 'light' | 'sepia';
    setTheme: (theme: 'light' | 'sepia') => void;
    fontFamily: 'sans' | 'serif';
    setFontFamily: (font: 'sans' | 'serif') => void;
    fontSize: number;
    setFontSize: (size: number | ((prev: number) => number)) => void;
    isFocusMode: boolean;
    onToggleFocusMode: () => void;
    // Optional styling override
    style?: React.CSSProperties;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({
    theme, setTheme,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    isFocusMode, onToggleFocusMode,
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
                                border: theme === t ? `2px solid #007AFF` : '1px solid transparent',
                                background: t === 'light' ? '#fff' : '#f6f1d1',
                                color: '#000',
                                cursor: 'pointer'
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
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 2, borderRadius: 8 }}>
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

            {/* Font Size */}
            <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Size</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => setFontSize(s => Math.max(50, s - 10))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'inherit' }}>A-</button>
                    <span style={{ fontSize: 14, opacity: 0.7 }}>{fontSize}%</span>
                    <button onClick={() => setFontSize(s => Math.min(200, s + 10))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, color: 'inherit' }}>A+</button>
                </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid rgba(128,128,128,0.2)', width: '100%', margin: 0 }} />

            {/* Focus Mode Toggle */}
            <button
                onClick={onToggleFocusMode}
                style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: isFocusMode ? '#007AFF' : 'rgba(0,0,0,0.05)',
                    color: isFocusMode ? '#fff' : 'inherit',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
            >
                <span>{isFocusMode ? 'Exit Focus' : 'Enter Focus Mode'}</span>
            </button>
        </div>
    );
};
