'use client';

import React, { useEffect, useState } from 'react';

export const MobileBlocker = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreen = () => {
            // Check if width is less than standard tablet breakpoint (768px)
            // or use regex for user agent if strictly mobile device detection is needed.
            // Screen width is usually reliable enough for "desktop only" requirement.
            setIsMobile(window.innerWidth < 768);
        };

        checkScreen();
        window.addEventListener('resize', checkScreen);
        return () => window.removeEventListener('resize', checkScreen);
    }, []);

    if (!isMobile) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            background: 'rgba(10, 10, 10, 0.98)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            color: '#fff'
        }}>
            <div style={{
                fontSize: 60,
                marginBottom: 24,
                animation: 'bounce 2s infinite'
            }}>
                💻
            </div>
            <h2 style={{
                fontFamily: 'serif',
                fontSize: 32,
                fontWeight: 700,
                marginBottom: 16,
                background: 'linear-gradient(to right, #60a5fa, #2dd4bf)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                Desktop Only
            </h2>
            <p style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: 400
            }}>
                To ensure the best immersive reading experience, this room is only accessible on desktop or laptop computers.
            </p>
            <div style={{
                marginTop: 32,
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.5)'
            }}>
                Please switch to a larger screen.
            </div>
        </div>
    );
};
