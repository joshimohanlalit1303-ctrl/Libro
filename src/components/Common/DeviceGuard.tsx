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
                background: 'rgba(10, 10, 10, 0.98)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                textAlign: 'center',
                color: '#fff',
                pointerEvents: 'all',
                overflow: 'hidden'
            }}>
                <div style={{
                    fontSize: 80,
                    marginBottom: 32,
                    animation: 'bounce 2s infinite'
                }}>
                    💻
                </div>
                <h2 style={{
                    fontFamily: 'serif',
                    fontSize: 36,
                    fontWeight: 700,
                    marginBottom: 20,
                    background: 'linear-gradient(to right, #60a5fa, #2dd4bf)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Desktop Experience
                </h2>
                <p style={{
                    fontSize: 18,
                    lineHeight: 1.6,
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxWidth: 420,
                    marginBottom: 32
                }}>
                    This reading room is designed for an immersive desktop experience. Mobile devices are currently not supported to ensure quality.
                </p>
                <div style={{
                    padding: '16px 32px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    fontSize: 15,
                    color: 'rgba(255, 255, 255, 0.6)'
                }}>
                    Please switch to a computer.
                </div>

                <style jsx>{`
                    @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                        40% {transform: translateY(-20px);}
                        60% {transform: translateY(-10px);}
                    }
                `}</style>
            </div>
        );
    }

    return <>{children}</>;
};
