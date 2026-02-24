
import React, { forwardRef } from 'react';

interface QuoteCardProps {
    text: string;
    author?: string;
    title?: string;
    coverUrl?: string;
}

export const QuoteCard = forwardRef<HTMLDivElement, QuoteCardProps>(({ text, author, title, coverUrl }, ref) => {
    return (
        <div
            ref={ref}
            data-quote-card="true"
            style={{
                width: 600,
                height: 750,
                background: '#111', // Deep black/gray
                backgroundImage: 'radial-gradient(circle at top right, #222 0%, #111 100%)',
                padding: '50px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                color: 'white',
                fontFamily: '"Domine", "Playfair Display", serif',
            }}
        >
            {/* Subtle Noise Texture */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.05,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                zIndex: 0, pointerEvents: 'none'
            }} />

            {/* Decorative Border */}
            <div style={{
                position: 'absolute', inset: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 1, pointerEvents: 'none'
            }} />

            {/* Main Content Area - Center Aligned */}
            <div style={{
                zIndex: 2, flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '20px'
            }}>
                {/* Top Quote Icon */}
                <div style={{
                    fontSize: 40, color: '#f59e0b', marginBottom: 20,
                    fontFamily: 'serif', opacity: 0.8
                }}>❝</div>

                <p style={{
                    fontSize: text.length > 300 ? 18 : text.length > 200 ? 22 : text.length > 100 ? 26 : 32,
                    lineHeight: text.length > 200 ? 1.5 : 1.6,
                    fontWeight: 500,
                    margin: 0,
                    textAlign: 'center',
                    color: '#f8fafc',
                    fontStyle: 'normal',
                    // Fix: html2canvas hates line-clamp. Use fixed dimensions.
                    maxHeight: 520, // Approx line height * lines
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {text}
                </p>

                {/* Bottom Quote Mark - removed for cleaner look, or small */}
                {/* <div style={{ fontSize: 40, color: '#f59e0b', marginTop: 20, fontFamily: 'serif', opacity: 0.8 }}>❞</div> */}
            </div>

            {/* Footer - Clean Row */}
            <div style={{
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                paddingTop: 30,
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* Cover (Vertical Rectangle) */}
                <div style={{
                    width: 50, height: 75, flexShrink: 0,
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: '#333',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                    {coverUrl ? (
                        <img src={coverUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                </div>

                {/* Text Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{
                        fontFamily: 'sans-serif', fontSize: 16, fontWeight: 700,
                        color: 'white', letterSpacing: '0.02em', textTransform: 'uppercase'
                    }}>
                        {title || 'Untitled'}
                    </span>
                    <span style={{
                        fontFamily: 'serif', fontSize: 16, color: '#94a3b8', fontStyle: 'italic'
                    }}>
                        {author}
                    </span>
                </div>

                {/* Logo */}
                <div style={{ opacity: 0.6 }}>
                    <span style={{ fontFamily: 'sans-serif', fontWeight: 900, fontSize: 14, letterSpacing: 2 }}>LIBRO</span>
                </div>
            </div>
        </div>
    );
});

QuoteCard.displayName = "QuoteCard";
