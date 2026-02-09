// @ts-nocheck
// v1.0.1 - Progress System Rebuilt
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import styles from './Reader.module.css';

const ReactReader = dynamic(() => import('react-reader').then((mod) => mod.ReactReader), {
    ssr: false,
    loading: () => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading Book...</div>
});

// Safe layout effect for SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

import { AppearanceMenu } from './AppearanceMenu';
// import { ShareModal } from './ShareModal'; // Removed per user request
import { useHighlights, Highlight } from '@/hooks/useHighlights';
// [NEW] AI Summary
import { SummaryModal } from './SummaryModal';
import { useAuth } from '@/context/AuthContext'; // Correct path
// Basic Popover UI for Highlighting
import { HighlightMenu } from './HighlightMenu'; // We will create this
import { DefinitionCard } from './DefinitionCard'; // [NEW]
import TransmutationModal from './TransmutationModal'; // [NEW]

const MOTIVATIONAL_QUOTES = [
    "Great progress! Keep going!",
    "One more chapter down, you're doing amazing!",
    "Knowledge is power. Keep reading!",
    "You're on a roll!",
    "Fantastic! Another chapter conquered.",
    "Stay curious, keep reading.",
    "Every page counts!",
    "You are becoming wiser with every word.",
    "Excellent dedication!",
    "Reading is dreaming with open eyes."
];


interface ReaderProps {
    roomId: string;
    isHost: boolean;
    username: string;
    isFocusMode: boolean;
    toggleFocusMode: () => void;

    // Appearance Props
    theme: 'light' | 'sepia' | 'dark';
    setTheme: (t: 'light' | 'sepia' | 'dark') => void;
    fontFamily: 'sans' | 'serif' | 'dyslexic';
    setFontFamily: (f: 'sans' | 'serif' | 'dyslexic') => void;
    fontSize: number;
    setFontSize: (s: number | ((prev: number) => number)) => void;
    showAppearanceMenu: boolean;
    setShowAppearanceMenu: (show: boolean) => void;
    roomType?: 'standard' | 'whisper';
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;

    // Focus Timer Callback
    onFocusLock?: (isLocked: boolean, timeRemaining: number) => void;
    // Accessibility
    ttsTrigger?: number;
}

// Define Handle Interface
export interface ReaderHandle {
    summarizeChapter: () => void;
    summarizePage: () => void;
    summarizeKnowledge: () => void;
    startFocus: (minutes: number) => void;
}

export const Reader = forwardRef<ReaderHandle, ReaderProps>(({
    roomId, isHost = true, username, isFocusMode, toggleFocusMode,
    theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, showAppearanceMenu, setShowAppearanceMenu,
    roomType,
    onSwipeUp, onSwipeDown, onFocusLock, ttsTrigger // [NEW]
}, ref) => {
    const { user } = useAuth();

    const [location, setLocation] = useState<string | number>(0);

    const [epubUrl, setEpubUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    const [renditionRef, setRenditionRef] = useState<any>(null);

    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ msg: string; id: number } | null>(null);

    // [REBUILT] Stability Refs for Resize/Fullscreen
    // We handle resize stability via longer debouncing in the redesigned system.

    // UI State
    const [atStart, setAtStart] = useState(true);
    const [tocOpen, setTocOpen] = useState(false);
    const [toc, setToc] = useState<any[]>([]);

    // Share/Quote State - REMOVED
    // const [selectedText, setSelectedText] = useState<string | null>(null);
    // const [showShareModal, setShowShareModal] = useState(false);

    // Focus Timer State (SDG 4.7)
    const [focusTimeRemaining, setFocusTimeRemaining] = useState(0);
    const [isFocusSessionActive, setIsFocusSessionActive] = useState(false);
    const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Start Session
    const startFocusSession = (minutes: number) => {
        const seconds = minutes * 60;
        setFocusTimeRemaining(seconds);
        setIsFocusSessionActive(true);
        // Force Focus Mode On
        if (!isFocusMode) toggleFocusMode();
    };

    // Stop Session
    const stopFocusSession = () => {
        if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
        setIsFocusSessionActive(false);
        setFocusTimeRemaining(0);
    };

    // Timer Effect
    useEffect(() => {
        if (isFocusSessionActive && focusTimeRemaining > 0) {
            focusIntervalRef.current = setInterval(() => {
                setFocusTimeRemaining((prev) => {
                    if (prev <= 1) {
                        stopFocusSession();
                        alert("Focus Session Complete! Great job!");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
        }

        return () => {
            if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
        };
    }, [isFocusSessionActive, focusTimeRemaining]); // Dep array looks safe-ish, ensure no infinite loop. 
    // Actually, `focusTimeRemaining` in dependency might cause re-creation of interval every second if not careful.
    // Better pattern: use functional update content inside interval and only depend on `isFocusSessionActive`.

    // REVISED TIMER EFFECT
    useEffect(() => {
        // [FIX] Always notify parent of status
        if (onFocusLock) {
            onFocusLock(isFocusSessionActive, focusTimeRemaining);
        }

        if (!isFocusSessionActive) return;

        const interval = setInterval(() => {
            setFocusTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsFocusSessionActive(false);
                    // Defer alert to avoid render clash
                    setTimeout(() => alert("Focus Session Complete! Great job!"), 100);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isFocusSessionActive, focusTimeRemaining, onFocusLock]);

    // Social Highlighting State

    // Handle Unmount cleanup
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Social Highlighting State
    const [bookId, setBookId] = useState<string | null>(null);
    const { highlights, addHighlight, addReaction, removeReaction, deleteHighlight } = useHighlights(bookId || undefined, roomId);

    // [NEW] AI Summary State
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryContent, setSummaryContent] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isSimulatedSummary, setIsSimulatedSummary] = useState(false);
    const [showTransmutation, setShowTransmutation] = useState(false); // [NEW]
    const [vaultWords, setVaultWords] = useState<string[]>([]); // [NEW] Echo Effect

    // [NEW] Summarize Logic
    const handleSummarizeChapter = async (mode: 'page' | 'chapter' | 'knowledge' = 'chapter') => {
        if (!renditionRef && mode !== 'knowledge') return;

        setShowSummaryModal(true);
        setIsSummarizing(true);
        setSummaryContent('');

        try {
            const book = renditionRef?.book;
            let chapterTitle = "";
            let cleanText = "";

            // 1. Identification & Text Extraction
            if (mode !== 'knowledge' && renditionRef) {
                const location = renditionRef.currentLocation();
                if (location && location.start) {
                    const spineIndex = location.start.index;
                    const spineItem = book.spine.get(spineIndex);

                    // Extract Title from TOC
                    if (toc && toc.length > 0) {
                        const currentHref = location.start.href;
                        const match = toc.find(item => item.href.includes(currentHref.split('#')[0]));
                        if (match) chapterTitle = match.label.trim();
                    }

                    if (mode === 'page') {
                        const contents = renditionRef.getContents();
                        if (contents && contents[0]) {
                            const doc = contents[0].document;
                            cleanText = (doc.body.innerText || doc.body.textContent || "").substring(0, 5000);
                        }
                    } else {
                        // FULL CHAPTER
                        let doc;
                        try {
                            doc = await spineItem.load();
                        } catch (loadErr) {
                            doc = await book.load(spineItem.href);
                        }
                        let rawText = "";
                        if (typeof doc === 'string') rawText = doc;
                        else if (doc && (doc.body || doc.documentElement)) {
                            rawText = (doc.body || doc.documentElement).innerText || (doc.body || doc.documentElement).textContent || "";
                        }
                        cleanText = rawText.replace(/\s+/g, ' ').trim();
                    }
                }
            }

            console.log(`AI: Summarizing Mode: ${mode}`, { chapterTitle });

            // 2. Call API
            const response = await fetch('/api/ai/summarize-v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: mode === 'knowledge' ? "" : cleanText,
                    bookTitle: bookMetadata?.title || "Book",
                    author: bookMetadata?.author || "Unknown",
                    chapterTitle: chapterTitle || "General Context",
                    isPageSummary: mode === 'page'
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setSummaryContent(data.summary);
            setIsSimulatedSummary(!!data.isSimulated);

        } catch (err: any) {
            console.error("AI Summary Failed:", err);
            setSummaryContent("Failed to generate summary. \n\nError: " + err.message);
        } finally {
            setIsSummarizing(false);
        }
    };

    // [NEW] Transmute Logic
    const handleTransmute = () => {
        if (!selectedRange?.text) return;
        setShowTransmutation(true);
        setSelectedRange(null); // Close the menu
    };

    // [NEW] Echo Effect: Fetch Vault Words
    useEffect(() => {
        if (!user) return;
        const fetchVault = async () => {
            const { data } = await supabase
                .from('vocabulary_vault')
                .select('word')
                .eq('user_id', user.id);
            if (data) setVaultWords(data.map(w => w.word.toLowerCase()));
        };
        fetchVault();
    }, [user, showTransmutation]); // Refetch if new word transmuted

    // [NEW] Expose Summarize to Parent
    useImperativeHandle(ref, () => ({
        summarizeChapter: () => handleSummarizeChapter(false),
        summarizePage: () => handleSummarizeChapter(true),
        startFocus: startFocusSession, // [NEW]
    }));

    // DEBUG LOG
    useEffect(() => { console.log("Reader: Social Highlighting bookId:", bookId); }, [bookId]);
    useEffect(() => { console.log("Reader: Highlights List Updated:", highlights.length); }, [highlights]);

    const [selectedRange, setSelectedRange] = useState<{ cfiRange: string; text: string; rect: DOMRect } | null>(null);
    const [viewingDefinition, setViewingDefinition] = useState(false); // [NEW]
    const [clickedHighlight, setClickedHighlight] = useState<{ id: string; rect: DOMRect } | null>(null);

    // We need book metadata for the card (title/author). 
    // We have 'name', but maybe not author/cover details easily accessible here?
    // Let's fetch them deeper or assume we have them. 
    // 'data' in fetchRoomAndBook had 'epub_url', 'name'. We might need to fetch 'books' table data.
    const [bookMetadata, setBookMetadata] = useState<{ title: string; author?: string; coverUrl?: string } | null>(null);

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
                // [FIX] Mobile: Use full width for "pages to pages" feel. Margins handled by epub.
                newWidth = isDesktop ? window.innerWidth - 320 : window.innerWidth;
                // Use safer height margin (80px) to prevent vertical clipping/scrolling
                newHeight = window.innerHeight - 80;
            }

            // Set size if valid
            if (newWidth > 0 && newHeight > 0) {
                setSize({ width: newWidth, height: newHeight });
            } else {
                console.warn("Reader: Sizing failed completely, defaulting to arbitrary safe size.");
                setSize({ width: 340, height: 600 }); // Safer default for mobile
            }
        };

        // Initial measure
        updateSize();

        // Observer for changes
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry && entry.contentRect.width > 0) {
                // [FIX] Ensure we respect padding even when observing container
                const isMobile = window.innerWidth < 768;
                const safeWidth = isMobile ? entry.contentRect.width - 32 : entry.contentRect.width;
                setSize({ width: safeWidth, height: entry.contentRect.height });
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Debounced Resize
        let resizeTimeout: NodeJS.Timeout;
        const debouncedUpdateSize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                requestAnimationFrame(updateSize);
            }, 200); // Slightly longer debounce for stability
        };

        window.addEventListener('resize', debouncedUpdateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', debouncedUpdateSize);
            clearTimeout(resizeTimeout);
        };
    }, []);

    // [FIX] Removed prevPage/nextPage helpers as buttons are removed per user request.
    // Navigation is now handled by swipes (mobile) or keyboard/edge-click (desktop).

    // const [bookId, setBookId] = useState<string | null>(null); // MOVED UP

    // Fetch the ePub URL
    useEffect(() => {
        mountedRef.current = true;
        const fetchRoomAndBook = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            // Fetch room AND related book details
            // 1. Fetch Room Metadata
            const { data: room, error: roomErr } = await supabase
                .from('rooms')
                .select('id, epub_url, name, book_id')
                .eq('id', roomId)
                .single();

            if (roomErr || !room) {
                console.error("Reader: Room fetch error", roomErr);
                if (mountedRef.current) {
                    setError("Failed to load room.");
                    setLoading(false);
                }
                return;
            }

            // 2. Setup Book URLs and IDs
            console.log("Reader: Room data fetched", room);

            let epubUrlToUse = room.epub_url;
            const effectiveBookId = room.book_id || room.id;

            // [FIX] Fallback for missing epub_url in room
            if (!epubUrlToUse && room.book_id) {
                console.log("Reader: epub_url missing in room, fetching from books table...");
                const { data: bookRecord } = await supabase
                    .from('books')
                    .select('epub_url')
                    .eq('id', room.book_id)
                    .single();
                if (bookRecord?.epub_url) {
                    epubUrlToUse = bookRecord.epub_url;
                }
            }

            if (!epubUrlToUse) {
                console.error("Reader: No epub_url found for room", roomId);
                if (mountedRef.current) {
                    setError("Book content reference is missing.");
                    setLoading(false);
                }
                return;
            }

            const isPdf = epubUrlToUse.toLowerCase().includes('.pdf');
            const isSupabase = epubUrlToUse.includes('supabase.co');

            // [FIX] Supabase storage usually has CORS (access-control-allow-origin: *) already configured.
            // Bypassing proxy for Supabase URLs to avoid potential proxy-related failures (encoding/timeouts).
            const finalUrl = (isPdf || isSupabase) ? epubUrlToUse : `/api/proxy?url=${encodeURIComponent(epubUrlToUse)}`;

            console.log("Reader: [DEBUG] Final URL for ReactReader:", finalUrl, " (Supabase bypassed:", isSupabase, ")");

            if (mountedRef.current) {
                setEpubUrl(finalUrl);
                setDebugUrl(epubUrlToUse);
                setBookId(effectiveBookId);
            }

            // 3. Fetch Book Metadata (Title/Author)
            let title = room.name;
            let author = "Unknown Author";
            let coverUrl = undefined;

            if (room.book_id) {
                const { data: bookData } = await supabase
                    .from('books')
                    .select('title, author, cover_url')
                    .eq('id', room.book_id)
                    .single();

                if (bookData) {
                    title = bookData.title || title;
                    author = bookData.author || "Unknown Author";
                    coverUrl = bookData.cover_url;
                }
            }

            if (mountedRef.current) {
                setBookMetadata({ title, author, coverUrl });
            }

            // 4. UNIFIED PROGRESS RESTORATION
            console.log("Reader: [PROGRESS] Starting restoration flow...");
            let bestLocation: string | number = 0;
            let source = "default";

            // a. Try Cloud First (as potentially the most mobile/cross-device source)
            if (user && effectiveBookId) {
                const { data: cloudProg } = await supabase
                    .from('user_progress')
                    .select('current_location, last_read_at')
                    .eq('user_id', user.id)
                    .eq('book_id', effectiveBookId)
                    .maybeSingle();

                if (cloudProg?.current_location) {
                    bestLocation = cloudProg.current_location;
                    source = "cloud";
                }
            }

            // b. Try LocalStorage (Might be more recent if on the same device)
            if (typeof window !== 'undefined') {
                const uName = user?.user_metadata?.username || username;
                const localKey = `libro_progress_${roomId}_${uName}`;
                const localSaved = localStorage.getItem(localKey);

                if (localSaved) {
                    // Logic: If we have both, for now we can just prefer Local if it exists, 
                    // or we could check timestamps if we saved them to local.
                    // For simplicity and since users usually stay on one device for a session:
                    // If local exists, it's often more "realtime" than the debounced cloud save.
                    console.log("Reader: [PROGRESS] Local found, comparing with Cloud...");
                    bestLocation = localSaved;
                    source = "local";
                }
            }

            // 5. Apply Restoration
            if (mountedRef.current) {
                console.log(`Reader: [PROGRESS] Applying (${source}):`, bestLocation);
                setLocation(bestLocation);

                if (bestLocation !== 0) {
                    setNotification({ msg: `Back to your spot (${source})`, id: Date.now() });
                }

                // Important: We don't set isRestoredRef.current = true YET.
                // We want to wait for the first 'locationChanged' that MATCHES this restored location,
                // OR wait for a small timeout, OR wait for rendition handled.
                // BEST: We set it true after a small delay in this mount effect, 
                // or we set it true in a separate useEffect that watches location.

                setLoading(false);

                // [NEW] Unified restoration lock
                setTimeout(() => {
                    if (mountedRef.current) {
                        console.log("Reader: [PROGRESS] Restoration lock released.");
                        isRestoredRef.current = true;
                    }
                }, 1500); // 1.5s is usually enough for ReactReader to mount and settle
            }
        };

        fetchRoomAndBook();
        return () => { mountedRef.current = false; };
    }, [roomId, user?.id, user?.user_metadata?.username]); // [FIX] Primitives only to avoid HMR/Ref issues

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

            // [FIX] Extended Theme Logic
            const bgColor = theme === 'sepia'
                ? '#f6f1d1'
                : theme === 'dark'
                    ? '#111111'
                    : '#ffffff';

            const textColor = theme === 'sepia'
                ? '#5f4b32'
                : theme === 'dark'
                    ? '#dedede'
                    : '#000000';

            // [FIX] Dynamic Blend Mode & Opacity
            // Dark Mode: 'normal' blend with opacity creates a visible tint without washing out white text.
            // Light Mode: 'multiply' creates a marker effect.
            const isDark = theme === 'dark';
            const highlightBlendMode = isDark ? 'normal' : 'multiply';
            const highlightOpacity = isDark ? '0.5' : '1.0'; // Multiply manages its own density

            // 1. Force Root Background
            if (doc.documentElement) {
                doc.documentElement.style.setProperty('background-color', bgColor, 'important');
            }
            if (doc.body) {
                doc.body.style.setProperty('background-color', bgColor, 'important');
                doc.body.style.setProperty('color', textColor, 'important');
                doc.body.style.setProperty('color', textColor, 'important');

                // [FIX] Font Family Logic - Sans vs Serif vs Dyslexic
                let fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                if (fontFamily === 'serif') fontStack = '"Merriweather", "Georgia", serif';
                if (fontFamily === 'dyslexic') fontStack = '"OpenDyslexic", "Comic Sans MS", sans-serif';

                doc.body.style.fontFamily = fontStack;
            }

            // 2. CSS Injection (Nuclear Option)
            if (doc.head) {
                let style = doc.getElementById('libro-theme-style');
                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'libro-theme-style';
                    doc.head.appendChild(style);
                }

                // [NEW] Inject OpenDyslexic Font Face
                const fontFace = `
                    @font-face {
                        font-family: 'OpenDyslexic';
                        src: url('https://cdn.jsdelivr.net/npm/opendyslexic@latest/open-dyslexic-regular.woff') format('woff');
                        font-weight: normal;
                        font-style: normal;
                    }
                `;

                style.innerHTML = `
                    ${fontFace}
                    html, body {
                        background-color: ${bgColor} !important;
                        color: ${textColor} !important;
                        /* [FIX] Remove aggressive layout constraints that break epub.js pagination */
                        margin: 0 !important;
                        padding: 0 !important; 
                        font-family: ${fontFamily === 'serif' ? '"Merriweather", "Georgia", serif' :
                        fontFamily === 'dyslexic' ? '"OpenDyslexic", "Comic Sans MS", sans-serif' :
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    } !important;
                    }

                    /* Text Color Strategy: Set on Body, force inheritance */
                    p, h1, h2, h3, h4, h5, h6, span, div, li, blockquote, pre {
                         color: inherit !important;
                         background-color: transparent !important;
                         font-family: inherit !important;
                    }

                    /* Allow images to retain own size/layout */
                    img, video, svg, canvas, picture {
                        background-color: transparent;
                        mix-blend-mode: ${theme === 'dark' ? 'screen' : 'multiply'};
                        max-width: 100%;
                    }
                    
                    /* Restore Highlight functionalities that might need bg color */
                    .hl-yellow, .hl-green, .hl-blue, .hl-pink, .hl-purple, .hl-red, .hl-orange {
                         /* These classes are applied to the wrapping span/mark usually */
                         /* The background-color is set below in specific rules, which are !important so they should win */
                    }
                    
                    a {
                        color: inherit !important;
                        text-decoration: underline;
                        cursor: pointer;
                    }
                    
                    /* Standardize Text */
                    p {
                        line-height: 1.6 !important;
                        text-align: left !important;
                    }
                    
                    /* HIGHLIGHT COLORS - Support both background (HTML) and fill (SVG) */
                    /* [FIX] Target all children (path, rect, etc.) to override defaults */
                    /* HIGHLIGHT COLORS - CSS ONLY STRATEGY */
                    /* Light/Sepia Mode: Multiply Blend for Marker Effect */
                    /* Dark Mode: Normal Blend with Transparency for Tint Effect */
                    
                    /* YELLOW */
                    .hl-yellow, .hl-yellow * { 
                        fill: ${isDark ? 'rgba(253, 224, 71, 0.4)' : '#fef3c7'} !important;
                        background-color: ${isDark ? 'rgba(253, 224, 71, 0.4)' : '#fef3c7'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* GREEN */
                    .hl-green, .hl-green * { 
                        fill: ${isDark ? 'rgba(110, 231, 183, 0.4)' : '#d1fae5'} !important;
                        background-color: ${isDark ? 'rgba(110, 231, 183, 0.4)' : '#d1fae5'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* BLUE */
                    .hl-blue, .hl-blue * { 
                        fill: ${isDark ? 'rgba(147, 197, 253, 0.4)' : '#bfdbfe'} !important;
                        background-color: ${isDark ? 'rgba(147, 197, 253, 0.4)' : '#bfdbfe'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* PINK */
                    .hl-pink, .hl-pink * { 
                        fill: ${isDark ? 'rgba(249, 168, 212, 0.4)' : '#fbcfe8'} !important;
                        background-color: ${isDark ? 'rgba(249, 168, 212, 0.4)' : '#fbcfe8'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* PURPLE */
                    .hl-purple, .hl-purple * { 
                        fill: ${isDark ? 'rgba(216, 180, 254, 0.4)' : '#e9d5ff'} !important;
                        background-color: ${isDark ? 'rgba(216, 180, 254, 0.4)' : '#e9d5ff'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* RED */
                    .hl-red, .hl-red * { 
                        fill: ${isDark ? 'rgba(252, 165, 165, 0.4)' : '#fecaca'} !important;
                        background-color: ${isDark ? 'rgba(252, 165, 165, 0.4)' : '#fecaca'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* ORANGE */
                    .hl-orange, .hl-orange * { 
                        fill: ${isDark ? 'rgba(253, 186, 116, 0.4)' : '#fed7aa'} !important;
                        background-color: ${isDark ? 'rgba(253, 186, 116, 0.4)' : '#fed7aa'} !important;
                        mix-blend-mode: ${highlightBlendMode} !important;
                    }
                    /* INK (Whisper Room) */
                    .hl-ink, .hl-ink * {
                        fill: rgba(44, 42, 38, 0.15) !important;
                        background-color: rgba(44, 42, 38, 0.15) !important;
                        mix-blend-mode: multiply !important;
                        border-bottom: 2px solid rgba(139, 111, 71, 0.3);
                        border-radius: 2px;
                        transform: rotate(-0.5deg);
                        display: inline-block;
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
            const el = contents.document; // Attach to document for broader capture
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

                // Relaxed Thresholds:
                // - diffX > 40 (was 50) for sensitivity
                // - diffY < 100 (was 30) because users swipe diagonally naturally
                const isHorizontalSwipe = Math.abs(diffX) > 40 && Math.abs(diffY) < 100;

                // Swipe Up Detection (Mobile Chat Open)
                if (diffY < -50 && Math.abs(diffX) < 80) {
                    if (onSwipeUp) onSwipeUp();
                    return;
                }

                // [NEW] Swipe Down Detection (Mobile Chat Close)
                if (diffY > 50 && Math.abs(diffX) < 80) {
                    if (onSwipeDown) onSwipeDown();
                    return;
                }

                if (isHorizontalSwipe) {
                    // Check safety before nav
                    if (!renditionRef || !renditionRef.book) return;

                    try {
                        if (diffX > 0) {
                            renditionRef.prev(); // Swipe Right -> Go Back
                        } else {
                            renditionRef.next(); // Swipe Left -> Go Next
                        }
                    } catch (e) {
                        console.warn("Swipe Nav Error", e);
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

        // 3. Selection Listener (Global)
        const onSelected = (cfiRange: string, contents: any) => {
            console.log("Reader: Selection detected", cfiRange);
            // The 'contents' arg might be the second one in some versions, or this is bound.
            // But we can get contents from rendition.getContents() usually, or the event provides it.
            // verify 'contents' matches expected object with 'window'

            // In epub.js v0.3, 'selected' emits (cfiRange, contents).
            if (!contents || !contents.window) {
                // Fallback: use current view's contents?
                // Actually if contents is missing, we can't get Rect easily without knowing which view.
                console.warn("Reader: Selection missing contents object");
                return;
            }

            const selection = contents.window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();
            if (!text) return;

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // iframe offset lookup
            // contents.document is inside the iframe.
            // We need the iframe element that corresponds to this contents.
            // contents.document.defaultView.frameElement should give the iframe!
            const iframe = contents.document.defaultView?.frameElement;
            const iframeRect = iframe?.getBoundingClientRect();

            const absoluteRect = new DOMRect(
                rect.left + (iframeRect?.left || 0),
                rect.top + (iframeRect?.top || 0),
                rect.width,
                rect.height
            );

            console.log("Reader: Setting selected range", absoluteRect);
            setSelectedRange({ cfiRange, text, rect: absoluteRect });
            setViewingDefinition(false); // [FIX] Reset definition view on new selection
            setClickedHighlight(null);
        };

        renditionRef.on('selected', onSelected);

        return () => {
            renditionRef.off('selected', onSelected);
            if (renditionRef && renditionRef.hooks && renditionRef.hooks.content) {
                // Clean up if possible
            }
        };
    }, [theme, fontFamily, fontSize, renditionRef]);

    // Mobile Responsiveness Logic
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        if (typeof window !== 'undefined') {
            checkMobile();
            window.addEventListener('resize', checkMobile);
        }
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // [EDTECH POLISH] Max-width for "Page" look on desktop
    // [FIX] Clamped to 1200px to ensure text is readable and fits within standard containers
    // [EDTECH POLISH] Max-width for "Page" look on desktop
    // [FIX] Clamped to 1200px to ensure text is readable and fits within standard containers
    const MAX_PAGE_WIDTH = 1200;

    // Calculate Paper Dimensions
    let paperWidth = size ? size.width : 0;
    if (!isMobile && size) {
        // Desktop: Clamp to max width, center it
        // [FIX] Increased margin back to 80px to safely clear the sidebar/UI
        paperWidth = Math.min(size.width - 80, MAX_PAGE_WIDTH);
    } else if (size) {
        paperWidth = size.width; // Mobile: Force full width (numeric for epub.js stability)
    }

    // Vertical margins for "Floating Paper" effect
    // Vertical margins for "Floating Paper" effect
    // [FIX] Reduced margin to 40px to prevent excessive whitespace impacting reading area
    // [FIX] Even in Focus Mode, we need a slight buffer (20px) to prevent bottom text clipping due to browser chrome/rounding
    const verticalMargin = (isMobile || isFocusMode) ? 20 : 60;
    const paperHeight = size ? Math.max(0, size.height - verticalMargin) : 0;

    // Render Highlights
    // Render Highlights
    const renderedHighlightsRef = useRef(new Map<string, string>()); // Map<ID, CFI>
    // Track layout hash to force full re-render of highlights on font/size change
    // [FIX] Include theme, font, size, AND container dimensions in hash to detect layout shifts
    // This ensures that when Focus Mode toggles (and width changes), highlights are re-calibrated.
    // [FIX] Include theme, font, size, AND container dimensions in hash to detect layout shifts
    // This ensures that when Focus Mode toggles (and width changes), highlights are re-calibrated.
    const layoutHash = `${fontFamily}-${fontSize}-${theme}-${isFocusMode}-${paperWidth}-${paperHeight}`;
    const prevLayoutHash = useRef(layoutHash);
    // [FIX] Force layout update when existing fullscreen to handle CSS transition delays
    useEffect(() => {
        if (!isFocusMode) {
            // Sidebar/Header take ~300ms to slide back in.
            // We trigger updates at multiple intervals to catch the intermediate and final states.
            const timers = [100, 300, 500].map(t =>
                setTimeout(() => window.dispatchEvent(new Event('resize')), t)
            );
            return () => timers.forEach(clearTimeout);
        }
    }, [isFocusMode]);

    // [FIX] Layout Version Signal
    // We increment this ONLY after the epub.js resize() promise resolves.
    // This ensures highlights are drawn on the *final* settled layout.
    const [layoutVersion, setLayoutVersion] = useState(0);

    useEffect(() => {
        if (!renditionRef) return;

        const currentIds = new Set(highlights.map(h => h.id));

        // [FIX] Detect Layout Change (Font/Size/Theme)
        // If layout changed, we MUST clear all previously rendered highlights because their 
        // coordinates/DOM elements might be invalid or misaligned.
        if (prevLayoutHash.current !== layoutHash) {
            console.log("Reader: Layout changed, clearing highlights to force redraw.");
            for (const [id, cfi] of renderedHighlightsRef.current.entries()) {
                try {
                    // Use strict remove
                    renditionRef.annotations.remove(cfi, 'highlight');
                } catch (e) { /* ignore */ }
            }
            renderedHighlightsRef.current.clear();
            prevLayoutHash.current = layoutHash;
        }

        // 1. Remove deleted highlights
        for (const [id, cfi] of renderedHighlightsRef.current.entries()) {
            if (!currentIds.has(id)) {
                try {
                    console.log("Reader: Removing highlight", id);
                    if (renditionRef && renditionRef.annotations) {
                        renditionRef.annotations.remove(cfi, 'highlight');
                    }
                    renderedHighlightsRef.current.delete(id);
                } catch (e) {
                    console.warn("Reader: Error removing highlight", e);
                }
            }
        }

        // 2. Add new highlights
        highlights.forEach(h => {
            // ... rest of add logic ...
            if (renderedHighlightsRef.current.has(h.id)) return; // Already rendered

            try {
                // Mapping colors to classes (Case-Insensitive & Normalized)
                // [FIX] Strict HEX matching but with fallback
                const c = h.color.toLowerCase().trim();
                let className = 'hl-yellow'; // Default

                // Ultra-robust check
                if (c.includes('d1fae5') || c.includes('#d1fae5')) className = 'hl-green';
                else if (c.includes('bfdbfe') || c.includes('#bfdbfe')) className = 'hl-blue';
                else if (c.includes('fbcfe8') || c.includes('#fbcfe8')) className = 'hl-pink';
                else if (c.includes('e9d5ff') || c.includes('#e9d5ff')) className = 'hl-purple';
                else if (c.includes('fecaca') || c.includes('#fecaca')) className = 'hl-red';
                else if (c.includes('fed7aa') || c.includes('#fed7aa')) className = 'hl-orange';

                // Debug log to confirm what we picked
                // console.log(`Reader: Color Match [${c}] -> ${className}`);

                renditionRef.annotations.add('highlight', h.cfi_range, {
                    id: h.id
                }, (e: MouseEvent) => {
                    console.log('Clicked highlight', h.id);
                    e.stopPropagation();
                    const target = e.target as HTMLElement;
                    const rect = target.getBoundingClientRect();
                    setClickedHighlight({ id: h.id, rect });
                    setSelectedRange(null);
                }, className);

                renderedHighlightsRef.current.set(h.id, h.cfi_range);
            } catch (e) {
                console.warn('Error rendering highlight', e);
            }
        });

    }, [highlights, renditionRef, layoutHash, layoutVersion]); // [FIX] Re-run on layoutHash change AND explicit layoutVersion signal

    // Force a secondary check after resize stabilizes
    useEffect(() => {
        if (!renditionRef) return;
        const t = setTimeout(() => {
            // Force re-render of highlights if they look detached? 
            // Or just trigger the state update again?
            // Actually, relying on layoutHash is correct, but maybe the *paperWidth* 
            // updates BEFORE the rendition.resize() has finished.
            // We can just rely on the Resize debounce to drive the paperWidth update?
            // Wait, paperWidth drives the resize.
        }, 500);
        return () => clearTimeout(t);
    }, [paperWidth]);

    // [EDTECH POLISH] Debounce Resize to prevent "Page Jumping" during CSS transitions (Sidebar toggle)

    // [EDTECH POLISH] Debounce Resize to prevent "Page Jumping" during CSS transitions (Sidebar toggle)
    // [EDTECH POLISH] Debounce Resize to prevent "Page Jumping" during CSS transitions (Sidebar toggle)
    // [EDTECH POLISH] Debounce Resize to prevent "Page Jumping" during CSS transitions (Sidebar toggle)
    const locationRef = useRef(location);
    useEffect(() => { locationRef.current = location; }, [location]);

    useEffect(() => {
        if (!renditionRef?.resize) return;

        // [FIX] Capture EXACT current position SYNCHRONOUSLY before waiting
        let validCfiBeforeResize: string | null = null;
        try {
            // [FIX] Strict checks to prevent 'undefined is not an object'
            if (renditionRef?.book?.package?.spine && renditionRef?.currentLocation) {
                // @ts-ignore
                const currentLoc = renditionRef.currentLocation();
                if (currentLoc && currentLoc.start) {
                    validCfiBeforeResize = currentLoc.start.cfi;
                }
            }
        } catch (e) {
            console.warn("Reader: Could not capture CFI before resize", e);
        }

        if (validCfiBeforeResize) {
            console.log("Reader: Resize Triggered. Captured CFI:", validCfiBeforeResize);
        }

        const handleResize = setTimeout(() => {
            try {
                // Resize
                if (renditionRef?.book?.package?.spine && renditionRef.resize) {
                    // [FIX] Wait for resize to complete before signaling layoutVersion
                    renditionRef.resize(paperWidth, paperHeight);

                    // Signal compatibility: Increment version so Highlights know it's safe to redraw
                    console.log("Reader: Resize Command Sent. Updating Signal.");
                    setLayoutVersion(v => v + 1);
                }

                // Use the synchronously captured CFI
                if (validCfiBeforeResize) {
                    console.log("Reader: Restoring captured CFI:", validCfiBeforeResize);
                    renditionRef.display(validCfiBeforeResize);
                } else {
                    // Fallback to locationRef but try to ensure it's a CFI if possible
                    console.log("Reader: Fallback restore to:", locationRef.current);
                    if (locationRef.current) renditionRef.display(locationRef.current);
                }
            } catch (err) {
                console.warn("Reader: Resize failed", err);
            }
        }, 350); // > 300ms (CSS transition time)

        return () => clearTimeout(handleResize);
    }, [size, paperWidth, paperHeight, renditionRef]); // [FIX] Removed isFocusMode (data race), added size (to force clamp enforcement)

    // ... (rest of component)


    // [NEW] Track Chapter Completion
    const currentChapterIndexRef = useRef<number | null>(null);

    // [NEW] Cloud Persistence (Manual)
    // [FIX] Restoration Guard to prevent overwriting cloud progress with initial local "page 1"
    const isRestoredRef = useRef(false);

    // [REBUILT] Progress Tracking Logic
    const handleLocationChanged = async (newLocation: string | number) => {
        // Guard: Do not track/save if we haven't finished the initial restoration
        if (!isRestoredRef.current) {
            // console.log("Reader: [PROGRESS] Restoration in progress, ignoring location change.");
            return;
        }

        // 1. Update React State (UI)
        setLocation(newLocation);

        // 2. Immediate Local Persistence (for snappiness)
        if (typeof window !== 'undefined') {
            const uName = user?.user_metadata?.username || username;
            localStorage.setItem(`libro_progress_${roomId}_${uName}`, String(newLocation));
        }

        // 3. Broadcast to others in the room
        if (supabase) {
            const channel = supabase.channel(`room-reader:${roomId}`);
            if (channel) {
                // We keep percentage as 0 for now, or we could calculate if renditionRef has them
                let percentage = 0;
                if (renditionRef?.book?.locations) {
                    try {
                        const raw = renditionRef.book.locations.percentageFromCfi(String(newLocation));
                        percentage = Math.round(raw * 100);
                    } catch (e) { }
                }

                await channel.send({
                    type: 'broadcast',
                    event: 'location_change',
                    payload: { location: newLocation, username: username, percentage },
                });
            }
        }

        // 4. Literacy Tracking (Target 4.6)
        if (lastLocationRef.current && lastLocationRef.current !== newLocation) {
            setWordsRead(prev => prev + 250);
        }
        lastLocationRef.current = newLocation;
    };

    // [NEW] Automatic Cloud Sync (Debounced)
    useEffect(() => {
        if (!location || !bookId || !user || !isRestoredRef.current) {
            // console.log("Reader: [AUTO-SAVE SKIP]", { hasLocation: !!location, hasBookId: !!bookId, hasUser: !!user, isRestored: isRestoredRef.current });
            return;
        }

        const timer = setTimeout(async () => {
            const cfi = location.toString();
            let percentage = 0;
            if (renditionRef?.book?.locations) {
                try {
                    // @ts-ignore
                    const rawPercentage = renditionRef.book.locations.percentageFromCfi(cfi);
                    percentage = Math.round(rawPercentage * 100);
                } catch (e) {
                    console.warn("Reader: Percentage calc error", e);
                }
            }

            try {
                console.log("Reader: [AUTO-SAVE] Saving progress...", { bookId, percentage, cfi });
                const { data, error } = await supabase.rpc('update_reading_progress_v5', {
                    p_book_id: bookId,
                    p_percentage: percentage,
                    p_location: cfi
                });
                if (error) throw error;
                console.log("Reader: [AUTO-SAVE] Success:", data);
            } catch (e: any) {
                console.error("Reader: [AUTO-SAVE] Failed", e);
                setNotification({ msg: "Progress Sync Failed", id: Date.now() });
            }
        }, 3000); // 3s debounce for better responsiveness

        return () => clearTimeout(timer);
    }, [location, bookId, user, renditionRef]);

    const scrollPosRef = useRef(0);

    // 1. Handle External Fullscreen Changes (ESC key, etc.)
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                // User exited fullscreen (e.g. via ESC)

                // Restore scroll AFTER exiting fullscreen
                setTimeout(() => {
                    window.scrollTo(0, scrollPosRef.current);
                }, 50);

                // Sync React State if it was in Focus Mode
                if (isFocusMode) {
                    toggleFocusMode();
                }
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [isFocusMode, toggleFocusMode]);

    // 2. Trigger Fullscreen based on Focus Mode state
    useEffect(() => {
        const toggleScreen = async () => {
            try {
                if (isFocusMode) {
                    if (!document.fullscreenElement) {
                        scrollPosRef.current = window.scrollY; // Save Scroll
                        await document.documentElement.requestFullscreen();
                    }
                } else {
                    if (document.fullscreenElement) {
                        await document.exitFullscreen();
                    }
                }
            } catch (err) {
                console.warn("Fullscreen toggle failed:", err);
            }
        };
        toggleScreen();
    }, [isFocusMode]);

    // [FIX] Force Rendition Resize on Focus Mode toggle to align Annotations/Highlights
    useEffect(() => {
        if (renditionRef && size) {
            // Slight delay to allow CSS transitions to finish
            const timer = setTimeout(() => {
                if (renditionRef.resize) {
                    console.log("Reader: Forcing resize for Focus Mode");
                    renditionRef.resize(paperWidth, paperHeight);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isFocusMode, size, paperWidth, paperHeight]);

    // [NEW] Time Tracking Logic
    const [sessionTime, setSessionTime] = useState(0); // Seconds in current unsaved chunk
    const sessionTimeRef = useRef(0);
    const totalSessionTimeRef = useRef(0); // Track total time for the report

    // [NEW] Literacy Tracking (Target 4.6)
    const [wordsRead, setWordsRead] = useState(0);
    const lastLocationRef = useRef<string | number | null>(null);

    // [NEW] Text-to-Speech (Target 4.a)
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (!ttsTrigger) return;

        const toggleSpeech = () => {
            const synth = window.speechSynthesis;
            if (synth.speaking) {
                synth.cancel();
                setIsSpeaking(false);
                return;
            }

            if (renditionRef) {
                try {
                    // Strategy 1: Smart Range Extraction (Best for accuracy)
                    // @ts-ignore
                    const location = renditionRef.currentLocation();
                    let text = "";

                    if (location && location.start && location.end) {
                        try {
                            // @ts-ignore
                            const range = renditionRef.getRange(location.start.cfi, location.end.cfi);
                            text = range.toString();
                        } catch (rangeErr) {
                            console.warn("TTS: Smart range failed, falling back to visible content.", rangeErr);
                        }
                    }

                    // Strategy 2: Fallback to View Content (If Range fails)
                    if (!text || text.length < 5) {
                        // @ts-ignore
                        const contents = renditionRef.getContents();
                        if (contents && contents.length > 0) {
                            // Get text from the first visible view
                            // @ts-ignore
                            text = contents[0].document.body.innerText;
                        }
                    }

                    if (text && text.length > 0) {
                        // Clean text (remove excessive newlines)
                        let cleanText = text.replace(/\s+/g, ' ').trim();

                        // [FIX] Truncate if too long to prevent browser "interrupted" or "timeout" errors
                        // 1500 chars is roughly 2-3 minutes of reading, safe for a single utterance.
                        if (cleanText.length > 1500) {
                            console.warn("TTS: Text too long, truncating to 1500 chars");
                            cleanText = cleanText.substring(0, 1500) + "...";
                        }

                        // Stop any previous instance explicitly
                        synth.cancel();

                        const utterance = new SpeechSynthesisUtterance(cleanText);
                        // @ts-ignore - Keep reference to prevent GC
                        window.speechUtteranceChunk = utterance;

                        // [FIX] Event handlers
                        utterance.onend = () => {
                            setIsSpeaking(false);
                            // @ts-ignore
                            window.speechUtteranceChunk = null;
                        };
                        utterance.onerror = (e) => {
                            // @ts-ignore
                            if (e.error === 'interrupted' || e.error === 'canceled') {
                                // Expected behavior when toggling
                                setIsSpeaking(false);
                                return;
                            }
                            // @ts-ignore
                            console.error("TTS Speech Error:", e.error, e);
                            setIsSpeaking(false);
                        };
                        synth.speak(utterance);
                        setIsSpeaking(true);
                    } else {
                        alert("No text found directly on this page.");
                        setIsSpeaking(false);
                    }
                } catch (err) {
                    console.error("TTS Critical Error:", err);
                    alert("Could not read text. Try selecting text specifically.");
                    setIsSpeaking(false);
                }
            }
        };
        toggleSpeech();
    }, [ttsTrigger]);

    useEffect(() => {
        sessionTimeRef.current = sessionTime;
    }, [sessionTime]);

    const syncErrorRef = useRef(false);

    useEffect(() => {
        // 1. Timer to increment seconds if window is focused
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible' && !syncErrorRef.current) {
                setSessionTime(prev => prev + 1);
            }
        }, 1000);

        // 2. Sync Function (calls RPC)
        const syncTime = async () => {
            if (syncErrorRef.current) return;

            const timeToSync = sessionTimeRef.current;
            // console.log("Reader: Checking sync...", { timeToSync, bookId }); 

            if (timeToSync === 0) return; // Sync even if no bookId (generic reading time)

            // [FIX] Update Total Session Time
            totalSessionTimeRef.current += timeToSync;
            const totalMinutes = totalSessionTimeRef.current / 60;

            // Calculate Stats based on TOTAL session, not just this chunk
            const estimatedWPM = totalMinutes > 0 ? Math.round(wordsRead / totalMinutes) : 0;

            // Format nice string
            let timeString = `${Math.round(totalMinutes)}m`;
            if (totalMinutes < 1) timeString = `${totalSessionTimeRef.current}s`;

            const reportMsg = `Session Report: ${timeString} read | ~${wordsRead} words | ${estimatedWPM > 0 ? estimatedWPM + ' WPM' : 'Keep going!'}`;

            // Reset local before async call
            setSessionTime(0);
            sessionTimeRef.current = 0;

            console.log(`Reader: Attempting to sync ${timeToSync} seconds...`);

            // Ensure we have a session before verifying
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn("Reader: No session, skipping sync");
                return;
            }

            // [FIX] Always pass p_book_id (nullable) to match function signature (seconds, p_book_id)
            const rpcArgs: any = {
                seconds: timeToSync,
                p_book_id: (bookId && bookId.length > 10) ? bookId : null
            };

            // [FIX] Use v4 for per-book tracking and anti-cheat (Resolved ambiguous column error)
            const { error } = await supabase.rpc('track_reading_time_v4', rpcArgs);

            if (error) {
                console.error("Reader: Time Sync failed:", JSON.stringify(error, null, 2));

                // [DEBUG] Show visible error to user
                setNotification({ msg: `Sync Failed: ${error.message || error.code}`, id: Date.now() });

                // If the function doesn't exist (migration missing), stop trying to prevent spam
                if (error.code === '42883' || error.message.includes('function') || error.message.includes('track_reading_time')) {
                    console.error("Reader: CRITICAL - 'track_reading_time_v4' RPC missing. Please run the migration!");
                    syncErrorRef.current = true;
                }

                // Restore time if failed (so we don't lose it) - simplistic retry
                setSessionTime(prev => prev + timeToSync); // Add back
                totalSessionTimeRef.current -= timeToSync; // Revert total too
            } else {
                // console.log("Reader: Sync success!");
                // [NEW] Literacy Feedback - Using pre-calculated reportMsg
                if (totalSessionTimeRef.current > 10) {
                    // Save to session storage so Dashboard can pick it up
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem('libro_last_session_report', reportMsg);
                    }
                }
            }
        };

        // 3. Auto-Sync Interval (every 30s)
        const syncInterval = setInterval(syncTime, 30000);

        // 4. Sync on Unmount / Tab Close
        const handleUnload = () => {
            // Best effort for tab close (Navigator.sendBeacon is better but RPC needs auth headers...)
            // With React unmount, we can try async call.
            syncTime();
        };

        return () => {
            clearInterval(timer);
            clearInterval(syncInterval);
            handleUnload();
        };
    }, [bookId]); // Re-run if bookId changes

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 20, height: 20, border: '2px solid #888', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p>Loading Book...</p>
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes fadeDown {
                        0% { opacity: 0; transform: translate(-50%, -20px); }
                        10% { opacity: 1; transform: translate(-50%, 0); }
                        70% { opacity: 1; transform: translate(-50%, 0); }
                        100% { opacity: 0; transform: translate(-50%, 20px); }
                    }
                `}</style>
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
                height: '100%', // [FIX] Use 100% to respect Grid area (Header takes top space)
                background: 'transparent', // [FIX] "Background space" should not be colored, only the book
            }}
        >
            <style>{`
                @keyframes fadeDown {
                    0% { opacity: 0; transform: translate(-50%, -20px); }
                    10% { opacity: 1; transform: translate(-50%, 0); }
                    70% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, 20px); }
                }
            `}</style>
            {/* [NEW] AI Summary Modal */}
            <SummaryModal
                isOpen={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
                content={summaryContent}
                isLoading={isSummarizing}
                isSimulated={isSimulatedSummary}
            />

            {/* [NEW] Transmutation Modal */}
            {showTransmutation && selectedRange?.text && (
                <TransmutationModal
                    word={selectedRange.text.trim()}
                    context={selectedRange.text} // Ideally we'd pass surrounding text, but text is fine for now
                    bookTitle={bookMetadata?.title || "Unknown Book"}
                    userId={user?.id}
                    onClose={() => setShowTransmutation(false)}
                />
            )}
            {/* Notification Toast */}
            {notification && (
                <div
                    key={notification.id}
                    onAnimationEnd={() => setNotification(null)}
                    style={{
                        position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(0, 0, 0, 0.4)', color: 'rgba(255, 255, 255, 0.9)',
                        padding: '12px 24px', borderRadius: 99,
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic', letterSpacing: '0.05em',
                        fontSize: 15, zIndex: 2000, pointerEvents: 'none',
                        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)',
                        animation: 'fadeDown 4s ease-in-out forwards', // Slower, more lingering
                        whiteSpace: 'nowrap'
                    }}>
                    {notification.msg}
                </div>
            )}
            {/* Manual Bookmark Button - MOVED TO HEADER */}
            {/* 
            <button
                onClick={saveBookmark}
                className="fixed top-24 left-8 px-5 py-3 bg-white text-black rounded-lg shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform z-[2147483647]"
                title="Bookmark Page"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="font-bold text-sm">Bookmark</span>
            </button> 
            */}
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
                    background: 'transparent', // [EDTECH] Outer background is dark (transparent to Global BG)
                    // [FIX] Removed overflow: hidden to prevent clipping bottom text
                }}>
                    <div style={{
                        width: isMobile ? '100%' : paperWidth,
                        height: isMobile ? '100%' : paperHeight,
                        position: 'relative',
                        background: theme === 'sepia' ? '#f6f1d1' : '#ffffff', // [EDTECH] The Paper
                        boxShadow: isMobile ? 'none' : '0 4px 30px rgba(0,0,0,0.5)', // [EDTECH] Soft Shadow (stronger for dark mode contrast)
                        borderRadius: isMobile ? 0 : 4,
                        // transition: 'width 0.3s ease, height 0.3s ease' // [FIX] Removed transition to prevent clipping sync issues during resize
                    }}>
                        {epubUrl?.toLowerCase().includes('.pdf') ? (
                            <iframe
                                src={epubUrl}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="PDF Reader"
                            />
                        ) : (
                            <ReactReader
                                key={epubUrl}
                                url={epubUrl}
                                location={location}
                                locationChanged={handleLocationChanged}
                                showToc={false}
                                tocChanged={(toc) => setToc(toc)}
                                errorView={
                                    <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                                        <div style={{ fontSize: 32 }}>📖</div>
                                        <p style={{ margin: '16px 0 8px' }}>The sanctuary is having trouble opening this volume.</p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            style={{ marginTop: 20, padding: '8px 16px', background: '#2c2a26', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                }
                                epubOptions={{
                                    flow: 'paginated',
                                    manager: 'default',
                                    // @ts-ignore
                                    openAs: 'epub',
                                    allowScriptedContent: true, // [FIX] Assist with sandbox permissions
                                    width: paperWidth,
                                    height: paperHeight,
                                    spread: isMobile ? 'none' : 'auto', // [FIX] Force single page on mobile
                                }}
                                // @ts-ignore
                                readerStyles={{
                                    container: {
                                        position: 'absolute',
                                        top: 0, bottom: 0, left: 0, right: 0,
                                        width: '100%', height: '100%',
                                    },
                                    arrow: { display: 'none' }, // [FIX] Hide default arrows
                                    prev: { display: 'none' },
                                    next: { display: 'none' }
                                }}
                                getRendition={(rendition: any) => {
                                    if (!rendition) return;

                                    // Safe assignment
                                    setRenditionRef(rendition);

                                    // Safe Hook Registration
                                    if (rendition.hooks && rendition.hooks.content) {
                                        rendition.hooks.content.register(async (contents: any) => {
                                            // Generate locations silently but WAIT for them if needed for initial progress
                                            try {
                                                if (rendition.book && rendition.book.locations && rendition.book.locations.length() === 0) {
                                                    console.log("Reader: Generating locations...");
                                                    await rendition.book.locations.generate(600);
                                                    console.log("Reader: Locations generated.");
                                                    // Trigger a location update to ensure percentage is accurate
                                                    const current = rendition.currentLocation();
                                                    if (current && current.start) {
                                                        handleLocationChanged(current.start.cfi);
                                                    }
                                                }
                                            } catch (e) {
                                                console.warn("Location generation (non-critical)", e);
                                            }

                                            // [NEW] Echo Effect: Highlight Vault Words
                                            if (vaultWords.length > 0) {
                                                const doc = contents.document;
                                                const body = doc.body;

                                                // Function to wrap words in a special span
                                                const highlightNodes = (node: Node) => {
                                                    if (node.nodeType === 3) { // Text node
                                                        const text = node.nodeValue || '';
                                                        let modified = false;
                                                        const fragments = doc.createDocumentFragment();
                                                        let lastIndex = 0;

                                                        // Build a regex for all vault words
                                                        const regex = new RegExp(`\\b(${vaultWords.join('|')})\\b`, 'gi');
                                                        let match;

                                                        while ((match = regex.exec(text)) !== null) {
                                                            modified = true;
                                                            // Add text before match
                                                            fragments.appendChild(doc.createTextNode(text.substring(lastIndex, match.index)));

                                                            // Add highlighted span
                                                            const span = doc.createElement('span');
                                                            span.textContent = match[0];
                                                            span.style.borderBottom = '2px double rgba(118, 75, 162, 0.4)';
                                                            span.style.cursor = 'help';
                                                            span.title = "A word from your Grimoire";
                                                            fragments.appendChild(span);

                                                            lastIndex = regex.lastIndex;
                                                        }

                                                        if (modified) {
                                                            fragments.appendChild(doc.createTextNode(text.substring(lastIndex)));
                                                            node.parentNode?.replaceChild(fragments, node);
                                                        }
                                                    } else if (node.nodeType === 1 && node.childNodes) {
                                                        // Elements - skip scripts/styles
                                                        const tagName = (node as Element).tagName.toLowerCase();
                                                        if (tagName !== 'script' && tagName !== 'style') {
                                                            Array.from(node.childNodes).forEach(highlightNodes);
                                                        }
                                                    }
                                                };

                                                highlightNodes(body);
                                            }
                                        });
                                    }
                                }}
                            />
                        )}
                    </div>
                </div >
            ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#888' }}>Initializing Reader...</p>
                </div>
            )
            }

            {/* Navigation Buttons - Removed per user request */}
            {/* User prefers keyboard arrow keys or edge clicking */}

            {/* Top Right Controls (Appearance) - ONLY VISIBLE IN FOCUS MODE */}
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
                    }}
                    >
                        {/* Toggle Appearance Menu */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
                                style={{
                                    width: 44, height: 44, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.85)', // Brighter default
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
                                        onStopFocusSession={stopFocusSession}

                                        // [NEW]
                                        onSummarize={() => handleSummarizeChapter('chapter')}
                                        onSummarizePage={() => handleSummarizeChapter('page')}
                                        onSummarizeKnowledge={() => handleSummarizeChapter('knowledge')}

                                        isFocusMode={isFocusMode}
                                        onToggleFocusMode={toggleFocusMode}

                                        isFocusSessionActive={isFocusSessionActive}
                                        focusTimeRemaining={focusTimeRemaining}
                                        onStartFocusSession={startFocusSession}
                                        onStopFocusSession={stopFocusSession}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Highlight UI Overlays - Portal to Body to avoid Z-Index/Overflow issues */}
            {
                selectedRange && !viewingDefinition && typeof document !== 'undefined' && createPortal(
                    <HighlightMenu
                        mode="create"
                        rect={selectedRange.rect}
                        onClose={() => {
                            setSelectedRange(null);
                            if (renditionRef) renditionRef.getContents().forEach((c: any) => c.window.getSelection().removeAllRanges());
                        }}
                        onCreate={async (color) => {
                            try {
                                // MATCH EXISTING SIGNATURE: cfi, text, color
                                await addHighlight(selectedRange.cfiRange, selectedRange.text, color);
                            } catch (err) {
                                console.error("Reader: Failed to save highlight", err);
                                alert("Failed to save highlight. Check console.");
                            }
                            setSelectedRange(null);
                            if (renditionRef) renditionRef.getContents().forEach((c: any) => c.window.getSelection().removeAllRanges());
                        }}
                        onDefine={() => setViewingDefinition(true)} // [NEW]
                        onTransmute={
                            selectedRange.text.trim().split(/\s+/).length === 1
                                ? handleTransmute : undefined
                        }
                        roomType={roomType}
                    />,
                    document.body
                )
            }

            {/* DEFINITION CARD PORTAL */}
            {
                selectedRange && viewingDefinition && typeof document !== 'undefined' && createPortal(
                    <DefinitionCard
                        word={selectedRange.text}
                        rect={selectedRange.rect}
                        onClose={() => {
                            setViewingDefinition(false);
                            setSelectedRange(null);
                            if (renditionRef) renditionRef.getContents().forEach((c: any) => c.window.getSelection().removeAllRanges());
                        }}
                    />,
                    document.body
                )
            }

            {
                clickedHighlight && typeof document !== 'undefined' && createPortal(
                    <HighlightMenu
                        mode="view"
                        rect={clickedHighlight.rect}
                        highlight={highlights.find(h => h.id === clickedHighlight.id)}
                        user={user}
                        onClose={() => setClickedHighlight(null)}
                        onDelete={async (id) => {
                            if (confirm('Delete this highlight?')) {
                                try {
                                    await deleteHighlight(id);
                                    setClickedHighlight(null);
                                } catch (err) {
                                    console.error("Reader: Delete failed", err);
                                    alert("Failed to delete highlight");
                                }
                            }
                        }}
                        onReact={(id, emoji) => addReaction(id, emoji)}
                        onRemoveReact={(id, emoji) => removeReaction(id, emoji)}
                    />,
                    document.body
                )
            }
        </div >
    );
}); // End forwardRef

Reader.displayName = 'Reader';

export default Reader;
