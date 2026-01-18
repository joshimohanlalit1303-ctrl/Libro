// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
import { useAuth } from '@/context/AuthContext'; // Correct path
// Basic Popover UI for Highlighting
import { HighlightMenu } from './HighlightMenu'; // We will create this


interface ReaderProps {
    roomId: string;
    isHost: boolean;
    username: string;
    isFocusMode: boolean;
    toggleFocusMode: () => void;

    // Appearance Props (Lifted)
    theme: 'light' | 'sepia' | 'dark';
    setTheme: (t: 'light' | 'sepia' | 'dark') => void;
    fontFamily: 'sans' | 'serif';
    fontFamily: 'sans' | 'serif';
    setFontFamily: (f: 'sans' | 'serif') => void;
    fontSize: number;
    setFontSize: (s: number | ((prev: number) => number)) => void;
    showAppearanceMenu: boolean;
    setShowAppearanceMenu: (show: boolean) => void;
    onSwipeUp?: () => void;
}

export const Reader: React.FC<ReaderProps> = ({
    roomId, isHost = true, username, isFocusMode, toggleFocusMode,
    theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, showAppearanceMenu, setShowAppearanceMenu,
    onSwipeUp
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

    // Share/Quote State
    // Share/Quote State - REMOVED
    // const [selectedText, setSelectedText] = useState<string | null>(null);
    // const [showShareModal, setShowShareModal] = useState(false);

    // Social Highlighting State
    const [bookId, setBookId] = useState<string | null>(null);
    const { highlights, addHighlight, addReaction, removeReaction, deleteHighlight } = useHighlights(bookId || undefined, roomId);

    // DEBUG LOG
    useEffect(() => { console.log("Reader: Social Highlighting bookId:", bookId); }, [bookId]);
    useEffect(() => { console.log("Reader: Highlights List Updated:", highlights.length); }, [highlights]);

    const [selectedRange, setSelectedRange] = useState<{ cfiRange: string; text: string; rect: DOMRect } | null>(null);
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
                // [FIX] Mobile: Subtract 32px (16px padding * 2) to ensure it fits
                newWidth = isDesktop ? window.innerWidth - 320 : window.innerWidth - 32;
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

        window.addEventListener('resize', updateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const prevPage = () => {
        console.log("Reader: Prev Page Clicked");
        if (renditionRef?.book?.package?.spine) {
            try { return renditionRef.prev(); } catch (e) { console.warn("Nav Error", e); }
        }
    };

    const nextPage = () => {
        console.log("Reader: Next Page Clicked");
        if (renditionRef?.book?.package?.spine) {
            try { return renditionRef.next(); } catch (e) { console.warn("Nav Error", e); }
        }
    };

    // const [bookId, setBookId] = useState<string | null>(null); // MOVED UP

    // Fetch the ePub URL
    useEffect(() => {
        mountedRef.current = true;
        const fetchRoomAndBook = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            // Fetch room AND related book details
            const { data, error } = await supabase
                .from('rooms')
                .select(`
                    id,
                    epub_url, 
                    name, 
                    book_id,
                    books (
                        title,
                        author,
                        cover_url
                    )
                `)
                .eq('id', roomId)
                .single();

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

            if (mountedRef.current) {
                // [FIX] Bypass proxy for PDFs to ensure proper iframe rendering and MIME type handling
                // Supabase Storage handles CORS fine for GET requests usually.
                const isPdf = data.epub_url.toLowerCase().includes('.pdf');
                const finalUrl = isPdf ? data.epub_url : `/api/proxy?url=${encodeURIComponent(data.epub_url)}`;

                setEpubUrl(finalUrl);
                setDebugUrl(data.epub_url);
                // [FIX] Ensure we always have a bookId for highlighting, even if no DB book exists
                // Fallback to roomId so highlights work for ad-hoc files in this room
                const effectiveBookId = data.book_id || data.id;
                setBookId(effectiveBookId);

                if (!data.book_id) console.warn("Reader: No linked book_id, using roomId as fallback for highlights:", effectiveBookId);
                else (console.log("Reader: Using linked book_id:", effectiveBookId));

                // Fetch book details independently to ensure we get author data
                // The joined query might fail if FK/RLS isn't perfect.
                let title = data.name;
                let author = "Unknown Author";
                let coverUrl = undefined;

                if (data.book_id) {
                    const { data: bookData } = await supabase
                        .from('books')
                        .select('title, author, cover_url')
                        .eq('id', data.book_id)
                        .single();

                    if (bookData) {
                        title = bookData.title;
                        author = bookData.author || "Unknown Author";
                        coverUrl = bookData.cover_url;
                    }
                } else if (data.books) {
                    // Fallback to joined data if it somehow worked (though debug says no)
                    // @ts-ignore
                    title = data.books.title;
                    // @ts-ignore
                    author = data.books.author;
                    // @ts-ignore
                    coverUrl = data.books.cover_url;
                }

                setBookMetadata({
                    title,
                    author,
                    coverUrl
                });

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
                doc.body.style.fontFamily = fontFamily === 'serif'
                    ? '"Merriweather", "Georgia", serif'
                    : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        overflow-x: hidden !important;
                    }
                    /* Add some internal padding to body content so text doesn't hit edge */
                    body {
                        padding: 0 20px !important; /* Safe margin for text */
                        max-width: 100vw !important;
                    }
                    /* Explicitly force text elements to use the correct color */
                    p, h1, h2, h3, h4, h5, h6, span, div, li, blockquote, pre {
                        color: ${textColor} !important;
                    }
                    /* Exceptions */
                    img, video, svg, canvas, picture {
                        background-color: transparent;
                        mix-blend-mode: ${theme === 'dark' ? 'screen' : 'multiply'};
                        max-width: 100%;
                    }
                    a {
                        color: inherit !important;
                        text-decoration: underline;
                        cursor: pointer;
                    }
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

                // Swipe Up Detection (Mobile Chat)
                if (diffY < -50 && Math.abs(diffX) < 80) {
                    if (onSwipeUp) onSwipeUp();
                    return;
                }

                if (isHorizontalSwipe) {
                    // Check safety before nav
                    if (!renditionRef?.book?.package?.spine) return;

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
            setClickedHighlight(null);
        };

        renditionRef.on('selected', onSelected);

        return () => {
            renditionRef.off('selected', onSelected);
            // Best effort cleanup for hooks (anonymous functions are hard to unregister)
            if (renditionRef && renditionRef.hooks && renditionRef.hooks.content) {
                // No easy way to unregister anonymous functions passed to register.
                // If these hooks cause issues, they might need named functions or a different cleanup strategy.
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
    // [FIX] Clamped to 1000px to prevent massive reflow when toggling Fullscreen
    const MAX_PAGE_WIDTH = 1000;

    // Calculate Paper Dimensions
    let paperWidth = size ? size.width : 0;
    if (!isMobile && size) {
        // Desktop: Clamp to max width, center it
        paperWidth = Math.min(size.width - 80, MAX_PAGE_WIDTH); // 80px min outer margin
    } else if (size) {
        paperWidth = size.width; // Mobile: Force full width (numeric for epub.js stability)
    }

    // Vertical margins for "Floating Paper" effect
    // Vertical margins for "Floating Paper" effect
    // [FIX] Increase margin on Desktop to prevent footer clipping (was 40, now 80)
    // [FIX] In Focus Mode, we want FULL height (0 margin)
    const verticalMargin = (isMobile || isFocusMode) ? 0 : 80;
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
        // If we wait for timeout, the browser might have already reflowed
        let validCfiBeforeResize: string | null = null;
        try {
            // [FIX] Strict checks to prevent 'undefined is not an object'
            if (renditionRef?.book?.package?.spine) {
                // @ts-ignore
                const currentLoc = renditionRef.currentLocation();
                if (currentLoc && currentLoc.start) {
                    validCfiBeforeResize = currentLoc.start.cfi;
                }
            }
        } catch (e) {
            console.warn("Reader: Could not capture CFI before resize", e);
        }

        console.log("Reader: Resize Triggered. Captured CFI:", validCfiBeforeResize);

        const handleResize = setTimeout(() => {
            try {
                // Resize
                if (renditionRef?.book?.package?.spine && renditionRef.resize) {
                    // [FIX] Wait for resize to complete before signaling layoutVersion
                    // rendition.resize usually returns a promise, or we assume it's done typically.
                    // But in epub.js it might trigger a reflow.
                    renditionRef.resize(paperWidth, paperHeight);

                    // Signal compatibility: Increment version so Highlights know it's safe to redraw
                    // We do this inside the timeout callback to ensure it happens after the resize call.
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
        if (renditionRef?.book?.package?.spine) {
            try {
                // @ts-ignore
                const locationObj = renditionRef.currentLocation();
                if (locationObj && locationObj.start) {
                    setAtStart(locationObj.start.index === 0 && locationObj.start.location === 0);

                    // Calculate percentage
                    // Check specifically for the existence of the method before calling
                    if (renditionRef.book.locations && typeof renditionRef.book.locations.percentageFromCfi === 'function') {
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
        if (supabase) {
            const channel = supabase.channel(`room-reader:${roomId}`);
            if (channel) {
                await channel.send({
                    type: 'broadcast',
                    event: 'location_change',
                    payload: { location: newLocation, username: username, percentage },
                });
            }
        }

        // Async save to DB (don't await to block UI)
        if (bookId) {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.id) {
                supabase.from('user_progress').upsert({
                    user_id: userData.user.id,
                    book_id: bookId,
                    progress_percentage: percentage,
                    is_completed: isCompleted,
                    last_read_at: new Date().toISOString()
                }, { onConflict: 'user_id, book_id' }).then(({ error }) => {
                    if (error) {
                        console.error("Error saving progress (Details):", JSON.stringify(error, null, 2));
                    }
                });
            }
        }
    };

    // [FIX] Fullscreen & Scroll Preservation Logic
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

    // [NEW] Time Tracking Logic
    const [sessionTime, setSessionTime] = useState(0); // Seconds in current unsaved chunk
    const sessionTimeRef = useRef(0);

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

            const rpcArgs: any = { seconds: timeToSync };
            // strictly check if bookId is a non-empty string to avoid UUID syntax errors
            if (bookId && bookId.length > 10) {
                rpcArgs.book_id = bookId;
            }

            // [FIX] Use v2 to avoid ambiguity error
            const { error } = await supabase.rpc('track_reading_time_v2', rpcArgs);

            if (error) {
                console.error("Reader: Time Sync failed:", JSON.stringify(error, null, 2));

                // [DEBUG] Show visible error to user
                setNotification({ msg: `Sync Failed: ${error.message || error.code}`, id: Date.now() });

                // If the function doesn't exist (migration missing), stop trying to prevent spam
                if (error.code === '42883' || error.message.includes('function') || error.message.includes('track_reading_time')) {
                    console.error("Reader: CRITICAL - 'track_reading_time_v2' RPC missing. Please run the migration!");
                    syncErrorRef.current = true;
                }

                // Restore time if failed (so we don't lose it) - simplistic retry
                setSessionTime(prev => prev + timeToSync); // Add back
            } else {
                console.log("Reader: Sync success!");
                // setNotification({ msg: `Saved ${timeToSync}s`, id: Date.now() });
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
                height: '100%', // [FIX] Use 100% to respect Grid area (Header takes top space)
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
                        transition: 'width 0.3s ease, height 0.3s ease'
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
                        )}
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

            {/* Highlight UI Overlays - Portal to Body to avoid Z-Index/Overflow issues */}
            {selectedRange && typeof document !== 'undefined' && createPortal(
                <HighlightMenu
                    mode="create"
                    rect={selectedRange.rect}
                    onClose={() => {
                        setSelectedRange(null);
                        if (renditionRef) renditionRef.getContents().forEach((c: any) => c.window.getSelection().removeAllRanges());
                    }}
                    onCreate={async (color) => {
                        console.log("Reader: Creating highlight...", { cfi: selectedRange.cfiRange, text: selectedRange.text, color, bookId });
                        try {
                            await addHighlight(selectedRange.cfiRange, selectedRange.text, color);
                            console.log("Reader: Highlight saved successfully.");
                        } catch (err) {
                            console.error("Reader: Failed to save highlight", err);
                            alert("Failed to save highlight. Check console.");
                        }
                        setSelectedRange(null);
                        if (renditionRef) renditionRef.getContents().forEach((c: any) => c.window.getSelection().removeAllRanges());
                    }}
                />,
                document.body
            )}

            {clickedHighlight && typeof document !== 'undefined' && createPortal(
                <HighlightMenu
                    mode="view"
                    rect={clickedHighlight.rect}
                    highlight={highlights.find(h => h.id === clickedHighlight.id)}
                    user={null}
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
            )}
        </div >
    );
};
