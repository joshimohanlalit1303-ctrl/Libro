
import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { QuoteCard } from './QuoteCard';
import { supabase } from '@/lib/supabase';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    bookTitle?: string;
    bookAuthor?: string;
    coverUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, text, bookTitle, bookAuthor, coverUrl }) => {
    const exportRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        if (!exportRef.current) return;
        setGenerating(true);
        try {
            // Capture the dedicated export element (unscaled, off-screen)
            // Cast options to any because @types/html2canvas might be missing 'scale'
            const canvas = await html2canvas(exportRef.current, {
                scale: 2,
                backgroundColor: '#111111',
                useCORS: true,
                logging: false,
            } as any);

            const link = document.createElement('a');
            link.download = `libro-quote-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Gamification: Award XP for sharing
            // We need the user ID. We can get it from context or props.
            // Let's assume we can import useAuth or pass userId
            // For now, let's just use the supabase client to get the session if possible, 
            // or better, refactor to use useAuth.
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Award 20 XP
                await supabase.rpc('award_xp', {
                    p_user_id: session.user.id,
                    p_amount: 20
                });

                // Check for 'Quote Sharer' badge immediately
                // We could toast this or just let it happen silently
                await supabase.rpc('check_achievements', { p_user_id: session.user.id });

                console.log("XP Awarded for sharing!");
            }

        } catch (err) {
            console.error("Image generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 20000,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
        }} onClick={onClose}>

            {/* HERMETIC EXPORT VERSION (Hidden from view, but rendered in DOM) */}
            <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', visibility: 'visible' }}>
                <QuoteCard
                    ref={exportRef}
                    text={text}
                    title={bookTitle}
                    author={bookAuthor}
                    coverUrl={coverUrl}
                />
            </div>

            <div style={{
                background: 'transparent',
                display: 'flex', flexDirection: 'column', gap: 24,
                alignItems: 'center',
                maxWidth: '100%',
                maxHeight: '100%',
                overflow: 'auto'
            }} onClick={e => e.stopPropagation()}>

                {/* VISIBLE PREVIEW (Scaled) */}
                <div style={{
                    // Make it responsive but keep aspect ratio
                    transform: 'scale(0.5)',
                    transformOrigin: 'top center',
                    marginBottom: -375 // Exact half of 750px height
                }}>
                    <QuoteCard
                        text={text}
                        title={bookTitle}
                        author={bookAuthor}
                        coverUrl={coverUrl}
                    />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
                    <button onClick={onClose} style={{
                        padding: '12px 24px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.2)',
                        background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600
                    }}>
                        Cancel
                    </button>
                    <button onClick={handleDownload} disabled={generating} style={{
                        padding: '12px 24px', borderRadius: 24, border: 'none',
                        background: 'white', color: 'black', cursor: 'pointer', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 8,
                        opacity: generating ? 0.7 : 1
                    }}>
                        {generating ? 'Generating...' : (
                            <>
                                <span>✨</span> Download Image
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
