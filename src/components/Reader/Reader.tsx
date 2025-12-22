// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const ReactReader = dynamic(() => import('react-reader').then((mod) => mod.ReactReader), { ssr: false });

// Safe layout effect for SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface ReaderProps {
    roomId: string;
    isHost: boolean;
    username: string;
}

export const Reader: React.FC<ReaderProps> = ({ roomId, isHost = true, username }) => {
    const [location, setLocation] = useState<string | number>(0);
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

    // Fetch the ePub URL
    useEffect(() => {
        mountedRef.current = true;
        const fetchRoomAndBook = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            const { data, error } = await supabase.from('rooms').select('epub_url, name').eq('id', roomId).single();

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
                setLoading(false);
            }
        };

        fetchRoomAndBook();
        return () => { mountedRef.current = false; };
    }, [roomId]);

    // Subscribe to location changes
    useEffect(() => {
        let retryTimeout: NodeJS.Timeout;
        const channel = supabase.channel(`room-reader:${roomId}`);

        channel
            .on('broadcast', { event: 'location_change' }, (payload) => {
                const { username: remoteUser, chapterTitle, percentage } = payload.payload;
                if (remoteUser === username) return;

                let msg = `${remoteUser} turned the page`;
                if (chapterTitle) msg = `${remoteUser} is on ${chapterTitle}`;
                if (percentage) msg += ` (${percentage}%)`;

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

    const handleLocationChanged = async (newLocation: string | number) => {
        setLocation(newLocation);

        // Fail-safe logic for getting specific chapter info and updating UI state
        try {
            if (renditionRef && renditionRef.book && renditionRef.book.package && renditionRef.book.spine) {
                // @ts-ignore
                const locationObj = renditionRef.currentLocation();
                if (locationObj && locationObj.start) {
                    setAtStart(locationObj.start.index === 0 && locationObj.start.location === 0);
                }
            }
        } catch (err) {
            console.warn("Reader: Error reading chapter info (safe to ignore)", err);
        }

        await supabase.channel(`room-reader:${roomId}`).send({
            type: 'broadcast',
            event: 'location_change',
            payload: { location: newLocation, username: username },
        });
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
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexDirection: 'column', gap: 16, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 40 }}>⚠️</div>
                <h3 style={{ margin: 0 }}>System Error</h3>
                <p style={{ color: '#ff3b30' }}>{error}</p>
                {debugUrl && <a href={debugUrl} target="_blank" style={{ color: '#0071e3' }}>Test Link</a>}
                <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6 }}>Retry</button>
            </div>
        );
    }

    if (!epubUrl) return null;

    return (
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: '100%', height: '100%' }}>

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '8px 16px', borderRadius: 20,
                    fontSize: 14, zIndex: 2000, pointerEvents: 'none'
                }}>
                    {notification.msg}
                </div>
            )}

            {/* Render Reader ONLY when size is determined, otherwise show spinner */}
            {size ? (
                <ReactReader
                    key={epubUrl} // CRITICAL: Force remount if URL changes
                    url={epubUrl}
                    location={location}
                    locationChanged={handleLocationChanged}
                    tocChanged={(toc) => setToc(toc)} // Capture TOC
                    epubOptions={{
                        flow: 'paginated',
                        manager: 'default',
                        // @ts-ignore
                        openAs: 'epub',
                        width: size.width,
                        height: size.height,
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
                        setRenditionRef(rendition);
                        rendition.hooks.content.register(async (contents: any) => {
                            try { await rendition.book.locations.generate(600); } catch (e) { }
                        });
                    }}
                />
            ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#888' }}>Initializing Reader...</p>
                </div>
            )}



            {/* Navigation Buttons (High Contrast & Top Z-Index & Inset 20px) */}

            {/* LEFT BUTTON: Hidden on first page */}
            {!atStart && (
                <button
                    onClick={prevPage}
                    style={{
                        position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                        zIndex: 10000,
                        background: 'rgba(50, 50, 50, 0.1)', color: '#333', // Light gray subtle look
                        border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%',
                        width: (size?.width || 0) < 600 ? 40 : 56,
                        height: (size?.width || 0) < 600 ? 40 : 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        opacity: 0.5, transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(50, 50, 50, 0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'rgba(50, 50, 50, 0.1)'; }}
                    aria-label="Previous Page"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
            )}

            <button
                onClick={nextPage}
                style={{
                    position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                    zIndex: 10000,
                    background: 'rgba(50, 50, 50, 0.1)', color: '#333',
                    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%',
                    width: (size?.width || 0) < 600 ? 40 : 56,
                    height: (size?.width || 0) < 600 ? 40 : 56,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    opacity: 0.5, transition: 'all 0.2s',
                    backdropFilter: 'blur(4px)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(50, 50, 50, 0.15)'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'rgba(50, 50, 50, 0.1)'; }}
                aria-label="Next Page"
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>

        </div>
    );
};
