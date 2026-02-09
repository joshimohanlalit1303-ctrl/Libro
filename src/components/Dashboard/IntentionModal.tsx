"use client";

import React, { useState } from 'react';

interface IntentionModalProps {
    onConfirm: (intention: string) => void;
    onCancel: () => void;
}

const INTENTIONS = [
    "15m Sprint (Seed) 🌱",
    "30m Deep Dive (Sprout) 🌿",
    "60m Monastic Session (Oak) 🌳",
    "Analyze a chapter",
    "Discuss themes",
];

export const IntentionModal: React.FC<IntentionModalProps> = ({ onConfirm, onCancel }) => {
    const [selected, setSelected] = useState(INTENTIONS[0]);
    const [custom, setCustom] = useState('');
    const [hovered, setHovered] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(custom || selected);
    };

    // Inline Styles - Parchment & Ink Theme
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.4)', // Lighter overlay
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    };

    const modalStyle: React.CSSProperties = {
        background: '#F6F2ED', // Soft Parchment
        border: '1px solid #EAE4DC',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)',
        color: '#1a0f0a', // Deep Ink
        width: '100%',
        maxWidth: '500px',
        borderRadius: '24px', // Slightly sharper for paper feel
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'scaleUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    };

    const getOptionStyle = (option: string, isSelected: boolean): React.CSSProperties => {
        const isHovered = hovered === option;
        return {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderRadius: '12px',
            // Border: Golden Amber for selected, Subtle Gray for normal
            border: isSelected ? '1px solid #d97706' : '1px solid rgba(0,0,0,0.06)',
            background: isSelected
                ? 'rgba(217, 119, 6, 0.08)' // Subtle Amber tint
                : isHovered ? 'rgba(0,0,0,0.03)' : '#fff', // White paper cards vs transparent
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: isSelected ? '#78350f' : '#1a0f0a', // Dark Amber text vs Ink
            marginBottom: '10px',
            fontSize: '17px',
            fontFamily: 'var(--font-serif)', // Use Serif for options too
            fontWeight: 500,
            transform: isHovered ? 'translateY(-1px)' : 'none',
            boxShadow: isSelected ? '0 4px 12px rgba(217, 119, 6, 0.1)' : 'none'
        };
    };

    return (
        <div style={overlayStyle} onClick={onCancel}>
            {/* Global Styles for Keyframes */}
            <style jsx global>{`
                @keyframes scaleUp {
                    from { transform: scale(0.98) translateY(4px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>

            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={{
                        margin: 0,
                        fontFamily: 'var(--font-serif)',
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#1a0f0a',
                        letterSpacing: '-0.02em'
                    }}>Set Intention</h2>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent', border: 'none',
                            width: 32, height: 32, borderRadius: '50%', color: '#666', fontSize: 24, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#000'}
                        onMouseLeave={e => e.currentTarget.style.color = '#666'}
                    >×</button>
                </div>

                <p style={{ marginBottom: 32, color: '#666', fontSize: 16, fontFamily: 'var(--font-sans)', lineHeight: '1.5' }}>
                    Define your goal. Choosing a <b>Focus Ladder</b> helps others in the room stay disciplined too.
                </p>

                <form onSubmit={handleSubmit}>
                    <div>
                        {INTENTIONS.map(option => {
                            const isSelected = selected === option && !custom;
                            return (
                                <div
                                    key={option}
                                    style={getOptionStyle(option, isSelected)}
                                    onClick={() => { setSelected(option); setCustom(''); }}
                                    onMouseEnter={() => setHovered(option)}
                                    onMouseLeave={() => setHovered(null)}
                                    role="radio"
                                    aria-checked={isSelected}
                                >
                                    {/* Radio Circle */}
                                    <div style={{
                                        width: 20, height: 20, borderRadius: '50%',
                                        border: isSelected ? '6px solid #d97706' : '2px solid #ccc',
                                        backgroundColor: isSelected ? '#fff' : 'transparent',
                                        flexShrink: 0,
                                        transition: 'all 0.2s ease'
                                    }} />
                                    {option}
                                </div>
                            );
                        })}

                        <div
                            style={getOptionStyle('custom', !!custom)}
                            onMouseEnter={() => setHovered('custom')}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                border: custom ? '6px solid #d97706' : '2px solid #ccc',
                                backgroundColor: custom ? '#fff' : 'transparent',
                                flexShrink: 0,
                                transition: 'all 0.2s ease'
                            }} />
                            <input
                                type="text"
                                placeholder="Or write your own..."
                                value={custom}
                                onChange={(e) => {
                                    setCustom(e.target.value);
                                    if (e.target.value) setSelected('');
                                }}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: custom ? '#78350f' : '#1a0f0a',
                                    fontSize: '17px',
                                    fontFamily: 'var(--font-serif)',
                                    width: '100%', outline: 'none', padding: 0
                                }}
                                onFocus={() => setSelected('')}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                        <button type="button" onClick={onCancel} style={{
                            background: 'transparent', color: '#666', border: 'none',
                            padding: '12px 24px', borderRadius: 99, fontWeight: 500, cursor: 'pointer', fontSize: 15,
                            fontFamily: 'var(--font-sans)',
                            transition: 'color 0.2s'
                        }}
                            onMouseEnter={e => e.currentTarget.style.color = '#000'}
                            onMouseLeave={e => e.currentTarget.style.color = '#666'}
                        >Cancel</button>

                        <button type="submit" style={{
                            background: '#1a0f0a', // Deep Ink
                            color: '#F6F2ED', // Parchment Text
                            border: '1px solid #1a0f0a',
                            padding: '12px 32px', borderRadius: 99, fontWeight: 600, cursor: 'pointer', fontSize: 15,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            fontFamily: 'var(--font-sans)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            }}
                        >Enter Room</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
