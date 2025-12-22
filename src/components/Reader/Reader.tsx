import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ReactReader } from 'react-reader';

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
    const [renditionRef, setRenditionRef] = useState<any>(null); // Store rendition to access TOC

    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    // Notifications State
    const [notification, setNotification] = useState<{ msg: string; id: number } | null>(null);

    const mountedRef = useRef(true);

    // Fetch the ePub URL for this room
    useEffect(() => {
        mountedRef.current = true;
        const fetchRoomAndBook = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);
            console.log("Reader: Fetching details for room ID:", roomId);

            // 1. Get Room Data
            const { data, error } = await supabase.from('rooms').select('epub_url, name').eq('id', roomId).single();

            if (error) {
                console.log("Reader: Raw DB Error:", error); // Use log instead of error for better object expansion

                if (error.code === 'PGRST116' || error.message?.includes('single JSON object') || error.details?.includes('0 rows')) {
                    console.warn("Reader: Room not found (likely deleted).");
                    if (mountedRef.current) {
                        setError("Room Not Found");
                        setErrorDetails("This room may have been deleted.");
                        setLoading(false);
                    }
                } else {
                    const errString = JSON.stringify(error, null, 2);
                    console.error("Reader: DB Error (JSON):", errString);

                    if (mountedRef.current) {
                        setError(`Failed to load room details.`);
                        // Fallback if message is missing
                        const detailMsg = error.message ? `${error.message} (${error.code})` : `Unknown Error: ${errString}`;
                        setErrorDetails(`DB Error: ${detailMsg}`);
                        setLoading(false);
                    }
                }
                return;
            }

            if (!data?.epub_url) {
                if (mountedRef.current) {
                    setError("No ePub file found for this room.");
                    setErrorDetails("The 'epub_url' field in the database is null or empty.");
                    setLoading(false);
                }
                return;
            }

            console.log("Reader: Found epub_url", data.epub_url);
            if (mountedRef.current) setDebugUrl(data.epub_url);

            // 2. Proxy Strategy (Direct URL)
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(data.epub_url)}`;

            console.log("Reader: Using Proxy URL:", proxyUrl);

            if (mountedRef.current) {
                setEpubUrl(proxyUrl);
                setDebugUrl(data.epub_url); // Keep original for debug link
                setLoading(false);
            }

        };

        fetchRoomAndBook();

        return () => {
            mountedRef.current = false;
        };
    }, [roomId]);

    // Subscribe to location changes (NOTIFICATIONS ONLY, NO SYNC)
    useEffect(() => {
        let retryTimeout: NodeJS.Timeout;
        const channel = supabase.channel(`room-reader:${roomId}`);

        channel
            .on('broadcast', { event: 'location_change' }, (payload) => {
                // Decoupled: We do NOT setLocation here.
                // We show a notification instead.
                const { username: remoteUser, chapterTitle, percentage } = payload.payload;

                // Don't notify for own events
                if (remoteUser === username) return;

                let msg = `${remoteUser} turned the page`;
                if (chapterTitle) {
                    msg = `${remoteUser} is on ${chapterTitle}`;
                }

                if (percentage) {
                    msg += ` (${percentage}%)`;
                }

                setNotification({ msg, id: Date.now() });

                // Auto-dismiss
                setTimeout(() => {
                    setNotification(null);
                }, 3000);
            })
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`[Reader] Channel Error: ${status}`, err);
                    // Retry logic
                    console.log("[Reader] Attempting to re-subscribe in 1s...");
                    retryTimeout = setTimeout(() => {
                        channel.subscribe();
                    }, 1000);
                }
            });

        return () => {
            clearTimeout(retryTimeout);
            supabase.removeChannel(channel);
        };
    }, [roomId, username]);

    const handleLocationChanged = async (newLocation: string | number) => {
        setLocation(newLocation);

        // Try to get chapter title and page percentage
        let chapterTitle = '';
        let percentage = 0;

        if (renditionRef) {
            try {
                // Get Chapter Title
                // @ts-ignore
                const locationObj = renditionRef.currentLocation();
                if (locationObj && locationObj.start) {
                    // Title
                    const item = renditionRef.book.spine.get(locationObj.start.cfi);
                    const navItem = renditionRef.book.navigation.get(item.href);
                    if (navItem) {
                        chapterTitle = navItem.label;
                    }

                    // Percentage (Page Progress)
                    // locations.percentageFromCfi returns 0-1
                    if (renditionRef.book.locations.length() > 0) {
                        const pct = renditionRef.book.locations.percentageFromCfi(locationObj.start.cfi);
                        percentage = Math.floor(pct * 100);
                    }
                }
            } catch (e) {
                console.warn("Could not get chapter info", e);
            }
        }

        // Broadcast event
        await supabase.channel(`room-reader:${roomId}`).send({
            type: 'broadcast',
            event: 'location_change',
            payload: {
                location: newLocation,
                username: username,
                chapterTitle: chapterTitle,
                percentage: percentage
            },
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
                <h3 style={{ margin: 0 }}>System Error: Loading Book</h3>
                <p style={{ color: '#ff3b30', maxWidth: 400, fontWeight: 500 }}>{error}</p>

                {errorDetails && (
                    <div style={{
                        fontSize: 12,
                        background: '#f5f5f7',
                        padding: 12,
                        borderRadius: 8,
                        maxWidth: '90%',
                        width: 400,
                        textAlign: 'left',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid #e5e5ea',
                        maxHeight: 200,
                        overflowY: 'auto'
                    }}>
                        {errorDetails}
                    </div>
                )}

                {debugUrl && (
                    <div style={{ fontSize: 13 }}>
                        <a href={debugUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0071e3', textDecoration: 'none' }}>
                            Test Link in New Tab &rarr;
                        </a>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        Retry
                    </button>
                    <button onClick={() => window.location.href = '/dashboard'} style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!epubUrl) return null;

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 14,
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {notification.msg}
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
                </div>
            )}

            <ReactReader
                url={epubUrl}
                location={location}
                locationChanged={handleLocationChanged}
                epubOptions={{
                    flow: 'scrolled',
                    manager: 'default',
                    // @ts-ignore
                    openAs: 'epub',
                }}
                getRendition={(rendition: any) => {
                    setRenditionRef(rendition);
                    // Hook into epubjs rendition errors
                    rendition.on('error', (err: any) => {
                        console.error("Reader: Rendition Error", err);
                        setError("Error rendering book content.");
                        setErrorDetails(err.toString());
                    });

                    // Generate locations for page progress (100 is low fidelity, good for simple % tracking)
                    // We do this after display to avoid blocking
                    rendition.hooks.content.register(async (contents: any) => {
                        try {
                            await rendition.book.locations.generate(600); // 600 chars per location default
                            console.log("Locations generated");
                        } catch (err) {
                            console.warn("Failed to generate locations", err);
                        }
                    });
                }}
            />
        </div>
    );
};

