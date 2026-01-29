'use client';

import React, { useEffect, useState, useLayoutEffect } from 'react';

/**
 * DeviceGuard
 * 
 * A robust wrapper that prevents children from rendering on mobile devices.
 * Features:
 * - Checks width (< 768px).
 * - Checks height (< 600px) for landscape phones.
 * - Locks body scroll when blocked.
 * - Prevents children from mounting (saving resources).
 * - Avoids FOUC (Flash of Unblocked Content) by defaulting to blocked state until verified.
 */
export const DeviceGuard = ({ children }: { children: React.ReactNode }) => {
    // Default to true (blocked) to prevent flashing desktop view on mobile
    // We will unblock only if we confirm it's a desktop.
    const [isBlocked, setIsBlocked] = useState(true);
    const [isChecking, setIsChecking] = useState(true);

    // Use LayoutEffect to check before paint if possible, fallback to Effect
    const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

    useIsomorphicLayoutEffect(() => {
        const checkDevice = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Block if:
            // 1. Width is mobile (< 768px for iPad Mini/Tablets we might want to allow 768+, so strict < 768)
            // 2. Height is very small (Landscape phone < 600px), unless width is large enough (Desktop)
            // Note: Standard 13" laptop height is ~800-900px.
            const isMobileWidth = width < 768;
            const isLandscapePhone = height < 500 && width < 1000; // stricter height for landscape phones

            const shouldBlock = isMobileWidth || isLandscapePhone;

            console.log(`[DeviceGuard] W:${width} H:${height} Blocked:${shouldBlock}`);

            setIsBlocked(shouldBlock);
            setIsChecking(false);

            // Lock scroll if blocked
            if (shouldBlock) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);

        return () => {
            window.removeEventListener('resize', checkDevice);
            document.body.style.overflow = ''; // Cleanup
        };
    }, []);

    if (isChecking) {
        // Render nothing or a loader while checking (avoids flash)
        return <div style={{ background: '#0a0a0a', height: '100vh', width: '100vw' }} />;
    }

    if (isBlocked) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483647, // Max safe integer
                background: '#F6F2ED', // Parchment
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                textAlign: 'center',
                color: '#2A2A2A',
                pointerEvents: 'all',
                overflow: 'hidden'
            }}>
                <div style={{
                    fontSize: 64,
                    marginBottom: 24,
                    opacity: 0.8,
                    filter: 'sepia(0.5)' // Old soul vibe
                }}>
                    🕰️
                </div>
                <h2 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 36,
                    fontWeight: 400,
                    marginBottom: 16,
                    color: '#2A2A2A',
                    fontStyle: 'italic',
                    letterSpacing: '-0.02em'
                }}>
                    The Library Awaits
                </h2>
                <div style={{
                    width: 60, height: 1, background: '#8B5A2B', marginBottom: 24, opacity: 0.3
                }} />
                <p style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: '#5C554B',
                    maxWidth: 380,
                    marginBottom: 32
                }}>
                    This sanctuary is designed for the quiet focus of a desktop experience.
                    <br /><br />
                    Please return when you are at a computer to enter the room.
                </p>
                <div style={{
                    padding: '12px 24px',
                    border: '1px solid rgba(139, 90, 43, 0.2)',
                    borderRadius: 4,
                    fontSize: 13,
                    color: '#8B5A2B',
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    background: 'rgba(139, 90, 43, 0.05)'
                }}>
                    Desktop Only
                </div>

                <style jsx>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            </div>
        );
    }

    return <>{children}</>;
};
