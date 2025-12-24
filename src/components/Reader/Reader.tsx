// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import styles from './Reader.module.css';

const ReactReader = dynamic(() => import('react-reader').then((mod) => mod.ReactReader), { ssr: false });

// Safe layout effect for SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

import { AppearanceMenu } from './AppearanceMenu';

interface ReaderProps {
    roomId: string;
    isHost: boolean;
    username: string;
    isFocusMode: boolean;
    toggleFocusMode: () => void;

    // Appearance Props (Lifted)
    theme: 'light' | 'sepia';
    setTheme: (t: 'light' | 'sepia') => void;
    fontFamily: 'sans' | 'serif';
    setFontFamily: (f: 'sans' | 'serif') => void;
    fontSize: number;
    setFontSize: (s: number | ((prev: number) => number)) => void;
    showAppearanceMenu: boolean;
    setShowAppearanceMenu: (show: boolean) => void;
}

export const Reader: React.FC<ReaderProps> = ({
    roomId, isHost = true, username, isFocusMode, toggleFocusMode,
    theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, showAppearanceMenu, setShowAppearanceMenu
}) => {
    // Initialize location from LocalStorage if available
    const [location, setLocation] = useState<string | number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`libro_progress_${roomId}_${username}`);
            return saved || 0;
        }
        return 0;
    });

    const [epubUrl, setEpubUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    const [renditionRef, setRenditionRef] = useState<any>(null);

    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; id: number } | null>(null);

    // UI State
    const [atStart, setAtStart] = useState(true);
    const [tocOpen, setTocOpen] = useState(false);
    const [toc, setToc] = useState<any[]>([]);

    const mountedRef = useRef(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize with non-zero default if possible to avoid blocking render if effect delays
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    // One-time rigid sizing logic - FORCE INITIALIZATION
    useIsomorphicLayoutEffect(() => {
        const updateSize = () => {
            let newWidth = 0;
            let newHeight = 0;

            // Try measuring container
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    newWidth = rect.width;
                    newHeight = rect.height;
                }
            }

            // Fallback to Window if container failed (ALWAYS RUNS IF NEEDED)
            if (newWidth === 0 && typeof window !== 'undefined') {
                const isDesktop = window.innerWidth > 768;
                newWidth = isDesktop ? window.innerWidth - 320 : window.innerWidth;
                // Use safer height margin (80px) to prevent vertical clipping/scrolling
                newHeight = window.innerHeight - 80;
            }

            // Set size if valid
            if (newWidth > 0 && newHeight > 0) {
                setSize({ width: newWidth, height: newHeight });
            } else {
                console.warn("Reader: Sizing failed completely, defaulting to arbitrary safe size.");
                setSize({ width: 800, height: 600 }); // Absolute last resort
            }
        };

        // Initial measure
        updateSize();

        // Observer for changes
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.contentRect.width > 0) {
                setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', updateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const prevPage = () => {
        console.log("Reader: Prev Page Clicked");
        if (renditionRef) {
            renditionRef.prev();
        }
    };

    const nextPage = () => {
        console.log("Reader: Next Page Clicked");
        if (renditionRef) {
            renditionRef.next();
        }
    };

    const [bookId, setBookId] = useState<string | null>(null);

    // Fetch the ePub URL
    useEffect(() => {
        mountedRef.current = true;
        const fetchRoomAndBook = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            const { data, error } = await supabase.from('rooms').select('epub_url, name, book_id').eq('id', roomId).single();

            if (error) {
                console.error("Reader: DB Error", error);
                if (mountedRef.current) {
                    setError("Failed to load room details.");
                    setErrorDetails(error.message);
                    setLoading(false);
                }
                return;
            }

            if (!data?.epub_url) {
                if (mountedRef.current) {
                    setError("No ePub file found.");
                    setLoading(false);
                }
                return;
            }

            const proxyUrl = `/api/proxy?url=${encodeURIComponent(data.epub_url)}`;
            if (mountedRef.current) {
                setEpubUrl(proxyUrl);
                setDebugUrl(data.epub_url);
                setBookId(data.book_id);
                setLoading(false);
            }
        };

        fetchRoomAndBook();
        return () => { mountedRef.current = false; };
    }, [roomId]);

    // Update location_change listener to correctly handle incoming broadcasts
    useEffect(() => {
        let retryTimeout: NodeJS.Timeout;
        const channel = supabase.channel(`room-reader:${roomId}`);

        channel
            .on('broadcast', { event: 'location_change' }, (payload) => {
                const { username: remoteUser, percentage } = payload.payload;
                if (remoteUser === username) return;

                let msg = `${remoteUser} moved`;
                if (percentage) msg = `${remoteUser} is at ${percentage}%`;

                setNotification({ msg, id: Date.now() });
                setTimeout(() => setNotification(null), 3000);
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    retryTimeout = setTimeout(() => channel.subscribe(), 1000);
                }
            });

        return () => {
            clearTimeout(retryTimeout);
            supabase.removeChannel(channel);
        };
    }, [roomId, username]);

    // Apply Theme & Font Changes
    useEffect(() => {
        if (!renditionRef) return;

        // Function to apply styles directly to the DOM
        const applyStylesToCheck = (contents: any) => {
            const doc = contents.document;
            if (!doc) return;

            const bgColor = theme === 'sepia' ? '#f6f1d1' : '#ffffff';
            const textColor = theme === 'sepia' ? '#5f4b32' : '#000000';

            // 1. Force Root Background
            if (doc.documentElement) {
                doc.documentElement.style.setProperty('background-color', bgColor, 'important');
            }
            if (doc.body) {
                doc.body.style.setProperty('background-color', bgColor, 'important');
                doc.body.style.setProperty('color', textColor, 'important');
                doc.body.style.fontFamily = fontFamily === 'serif'
                    ? '"Merriweather", "Georgia", serif'
                    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                // [FIX] No internal padding to avoid column shift
            }

            // 2. CSS Injection (Nuclear Option)
            if (doc.head) {
                let style = doc.getElementById('libro-theme-style');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'libro-theme-style';
                    doc.head.appendChild(style);
                }

                style.innerHTML = `
                    html, body {
                        background-color: ${bgColor} !important;
                        color: ${textColor} !important;
                        box-sizing: border-box !important;
                    }
                    /* Force all elements to be transparent */
                    body * {
                        background-color: transparent !important;
                        color: inherit !important;
                    }
                    /* Exceptions */
                    img, video, svg, canvas, picture {
                        background-color: transparent;
                        mix-blend-mode: multiply;
                        max-width: 100%;
                    }
                    a {
                        color: inherit !important;
                        text-decoration: underline;
                        cursor: pointer;
                    }
                `;
            }

            // 3. JS Cleanup: Iterate and wipe inline styles to be 100% sure
            try {
                const allElements = doc.querySelectorAll('body *');
                allElements.forEach((el: HTMLElement) => {
                    // Skip media
                    const tag = el.tagName.toLowerCase();
                    if (['img', 'video', 'svg', 'canvas', 'picture', 'a'].includes(tag)) return;

                    // Wipe background if it's set
                    if (el.style && el.style.backgroundColor) {
                        el.style.backgroundColor = 'transparent';
                    }
                });
            } catch (e) {
                // Ignore DOM errors
            }
        };

        // 1. Register Hook for NEW chapters
        // We use a unique ID or just register it. To avoid duplicates, we could clean up,
        // but explicit registration is safer given re-renders.
        // We wrap it to ensure it uses the *current* theme closure.
        renditionRef.hooks.content.register(applyStylesToCheck);

        // [FIX] Mobile Swipe Navigation
        const applySwipeListeners = (contents: any) => {
            const el = contents.document.documentElement; // Attach to root
            if (!el) return;

            let startX = 0;
            let startY = 0;
            let startTime = 0;

            el.addEventListener('touchstart', (e: any) => {
                startX = e.changedTouches[0].clientX;
                startY = e.changedTouches[0].clientY;
                startTime = new Date().getTime();
            }, { passive: true });

            el.addEventListener('touchend', (e: any) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;
                const timeDiff = new Date().getTime() - startTime;

                if (timeDiff > 500) return; // Ignore long presses

                // Horizontal Swipe Threshold (50px) and Vertical Safety (30px)
                if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
                    if (diffX > 0) {
                        renditionRef.prev(); // Swipe Right -> Go Back
                    } else {
                        renditionRef.next(); // Swipe Left -> Go Next
                    }
                }
            }, { passive: true });
        };
        renditionRef.hooks.content.register(applySwipeListeners);

        // 2. Apply immediately to ANY existing views (vital for initial load)
        const specificViews = renditionRef.getContents();
        specificViews.forEach((contents: any) => {
            applyStylesToCheck(contents);
            applySwipeListeners(contents);
        });

        // 3. Fallback: Also use the standard theme registration just in case
        try {
            renditionRef.themes.register('custom', {
                body: {
                    'background-color': theme === 'sepia' ? '#f6f1d1 !important' : '#ffffff !important',
                    'color': theme === 'sepia' ? '#5f4b32 !important' : '#000000 !important',
                }
            });
            renditionRef.themes.select('custom');
            renditionRef.themes.fontSize(`${fontSize}%`);
        } catch (e) {
            console.warn("Theme fallback error", e);
        }

        return () => {
            // Best effort cleanup
            if (renditionRef && renditionRef.hooks && renditionRef.hooks.content) {
                // Clean up logic if possible, though unregistering anonymous functions is hard.
            }
        };
    }, [theme, fontFamily, fontSize, renditionRef]);

    // Mobile Responsiveness Logic
    const isMobile = size ? size.width < 768 : false;
    const horizontalMargin = isMobile ? 20 : 60;
    const verticalMargin = isMobile ? 20 : 40;

    // Force Epub.js resize when container size changes
    useEffect(() => {
        if (renditionRef?.resize) {
            try {
                // Resize then re-display current location to prevent jumping to previous page
                // [FIX] Use calculated dynamic margins
                renditionRef.resize(Math.max(0, size.width - horizontalMargin), Math.max(0, size.height - verticalMargin));
                if (location) {
                    renditionRef.display(location);
                }
            } catch (err) {
                console.warn("Reader: Resize failed", err);
            }
        }
    }, [size?.width, size?.height, renditionRef, isFocusMode]); // Depend on location? No, might cause loop.

    // ... (rest of component)


    const handleLocationChanged = async (newLocation: string | number) => {
        setLocation(newLocation);

        // Persist to LocalStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem(`libro_progress_${roomId}_${username}`, String(newLocation));
        }

        let percentage = 0;
        let isCompleted = false;

        // Fail-safe logic for getting specific chapter info and updating UI state
        // [FIX] Strict checks to prevent 'undefined is not an object'
        if (renditionRef && renditionRef.book && renditionRef.book.package && renditionRef.book.package.spine) {
            try {
                // @ts-ignore
                const locationObj = renditionRef.currentLocation();
                if (locationObj && locationObj.start) {
                    setAtStart(locationObj.start.index === 0 && locationObj.start.location === 0);

                    // Calculate percentage
                    if (renditionRef.book.locations && renditionRef.book.locations.percentageFromCfi) {
                        try {
                            const percent = renditionRef.book.locations.percentageFromCfi(locationObj.start.cfi);
                            if (percent) {
                                percentage = Math.round(percent * 100);
                                if (percentage > 90) isCompleted = true;
                            }
                        } catch (locErr) {
                            console.warn("Reader: Error calculating percentage", locErr);
                        }
                    }
                }
            } catch (err) {
                console.warn("Reader: Error reading chapter info", err);
            }
        }

        // Broadcast change
        await supabase.channel(`room-reader:${roomId}`).send({
            type: 'broadcast',
            event: 'location_change',
            payload: { location: newLocation, username: username, percentage },
        });

        // Async save to DB (don't await to block UI)
        if (bookId) {
            supabase.from('user_progress').upsert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                book_id: bookId,
                progress_percentage: percentage,
                is_completed: isCompleted,
                last_read_at: new Date().toISOString()
            }, { onConflict: 'user_id, book_id' }).then(({ error }) => {
                if (error) {
                    // [FIX] improved error logging
                    console.error("Error saving progress (Details):", JSON.stringify(error, null, 2));
                }
            });
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 20, height: 20, border: '2px solid #888', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p>Loading Book...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        // [FIX] Auto-reload after 1 second as requested
        setTimeout(() => {
            window.location.reload();
        }, 1000);

        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexDirection: 'column', gap: 16, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 40 }}>⚠️</div>
                <h3 style={{ margin: 0 }}>Room Unavailable</h3>
                <p style={{ color: '#ff3b30' }}>Room is deleted or no more available.</p>
                <p style={{ fontSize: 12 }}>Auto-reloading...</p>
                {debugUrl && <a href={debugUrl} target="_blank" style={{ color: '#0071e3' }}>Test Link</a>}
                <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6 }}>Retry Now</button>
            </div>
        );
    }

    if (!epubUrl) return null;

    return (
        <div
            ref={containerRef}
            className={styles.container}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: 'transparent', // [FIX] "Background space" should not be colored, only the book
            }}
        >
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.5)', color: 'white', padding: '8px 16px', borderRadius: 20,
                    fontSize: 14, zIndex: 2000, pointerEvents: 'none',
                    backdropFilter: 'blur(4px)'
                }}>
                    {notification.msg}
                </div>
            )}

            {/* Render Reader ONLY when size is determined, otherwise show spinner */}
            {size ? (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme === 'sepia' ? '#f6f1d1' : '#ffffff', // [FIX] Wrapper matches theme
                }}>
                    <div style={{
                        width: Math.max(0, size.width - horizontalMargin), // [FIX] Dynamic safety margin
                        height: Math.max(0, size.height - verticalMargin), // [FIX] Dynamic vertical margin
                        position: 'relative',
                        background: 'transparent',
                    }}>
                        <ReactReader
                            key={epubUrl}
                            url={epubUrl}
                            location={location}
                            locationChanged={handleLocationChanged}
                            showToc={false}
                            tocChanged={(toc) => setToc(toc)}
                            epubOptions={{
                                flow: 'paginated',
                                manager: 'default',
                                // @ts-ignore
                                openAs: 'epub',
                                width: Math.max(0, size.width - horizontalMargin), // [FIX] Sync with container
                                height: Math.max(0, size.height - verticalMargin),
                                spread: isMobile ? 'none' : 'auto', // [FIX] Force single page on mobile
                            }}
                            // @ts-ignore
                            readerStyles={{
                                container: {
                                    position: 'absolute',
                                    top: 0, bottom: 0, left: 0, right: 0,
                                    width: '100%', height: '100%',
                                }
                            }}
                            getRendition={(rendition: any) => {
                                if (!rendition) return;

                                // Safe assignment
                                setRenditionRef(rendition);

                                // Safe Hook Registration
                                if (rendition.hooks && rendition.hooks.content) {
                                    rendition.hooks.content.register(async (contents: any) => {
                                        // Generate locations silently
                                        try {
                                            if (rendition.book && rendition.book.locations) {
                                                await rendition.book.locations.generate(600);
                                            }
                                        } catch (e) {
                                            console.warn("Location generation (non-critical)", e);
                                        }
                                    });
                                }
                            }}
                        />
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#888' }}>Initializing Reader...</p>
                </div>
            )
            }

            {/* Navigation Buttons (High Contrast & Top Z-Index & Inset 20px) */}
            {/* LEFT BUTTON: Hidden on first page */}
            {
                !atStart && (
                    <button
                        onClick={prevPage}
                        style={{
                            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                            zIndex: 10000,
                            background: 'rgba(255, 255, 255, 0.8)', color: '#333',
                            border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%',
                            width: (size?.width || 0) < 600 ? 40 : 56,
                            height: (size?.width || 0) < 600 ? 40 : 56,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            opacity: 0, transition: 'all 0.2s',
                            backdropFilter: 'blur(4px)'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                        aria-label="Previous Page"
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                )
            }

            <button
                onClick={nextPage}
                style={{
                    position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                    zIndex: 10000,
                    background: 'rgba(255, 255, 255, 0.8)', color: '#333',
                    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%',
                    width: (size?.width || 0) < 600 ? 40 : 56,
                    height: (size?.width || 0) < 600 ? 40 : 56,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    opacity: 0, transition: 'all 0.2s',
                    backdropFilter: 'blur(4px)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                aria-label="Next Page"
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>

            {/* Top Right Controls (Focus Mode & Appearance) - ONLY VISIBLE IN FOCUS MODE */}
            {
                isFocusMode && (
                    <div style={{
                        position: 'fixed',
                        top: 20,
                        right: 20,
                        zIndex: 10000,
                        display: 'flex',
                        gap: 12,
                        transition: 'opacity 0.2s, top 0.3s ease',
                        opacity: (!showAppearanceMenu) ? 0.4 : 1, // Keep slightly visible in focus mode so user can find it
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => !showAppearanceMenu ? e.currentTarget.style.opacity = '0.4' : null}
                    >
                        {/* Toggle Appearance Menu */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
                                style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(128,128,128,0.2)', cursor: 'pointer',
                                    color: '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                }}
                            >
                                <span style={{ fontSize: 18, fontWeight: 500 }}>Aa</span>
                            </button>

                            {showAppearanceMenu && (
                                <div style={{ position: 'absolute', top: 56, right: 0 }}>
                                    <AppearanceMenu
                                        theme={theme} setTheme={setTheme}
                                        fontFamily={fontFamily} setFontFamily={setFontFamily}
                                        fontSize={fontSize} setFontSize={setFontSize}
                                        isFocusMode={isFocusMode}
                                        onToggleFocusMode={toggleFocusMode}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};
