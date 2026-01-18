"use client";

import React, { useState } from 'react';

interface IntentionModalProps {
    onConfirm: (intention: string) => void;
    onCancel: () => void;
}

const INTENTIONS = [
    "Read 20 pages",
    "Read for 30 minutes",
    "Analyze a chapter",
    "Discuss themes",
    "Build a reading habit"
];

export const IntentionModal: React.FC<IntentionModalProps> = ({ onConfirm, onCancel }) => {
    const [selected, setSelected] = useState(INTENTIONS[0]);
    const [custom, setCustom] = useState('');
    const [hovered, setHovered] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(custom || selected);
    };

    // Inline Styles to guarantee layout and Liquid Glass look
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    };

    const modalStyle: React.CSSProperties = {
        background: 'rgba(30, 30, 30, 0.75)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)', // Safari support
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 40px 80px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255,255,255,0.2)',
        color: '#fff',
        width: '100%',
        maxWidth: '500px',
        borderRadius: '32px',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'scaleUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px'
    };

    const getOptionStyle = (option: string, isSelected: boolean): React.CSSProperties => {
        const isHovered = hovered === option;
        return {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderRadius: '16px',
            border: isSelected ? '1px solid #0071E3' : '1px solid rgba(255,255,255,0.1)',
            background: isSelected
                ? 'linear-gradient(135deg, rgba(0, 113, 227, 0.2), rgba(0, 113, 227, 0.1))'
                : isHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)',
            marginBottom: '10px',
            fontSize: '17px',
            transform: isHovered ? 'translateY(-1px)' : 'none'
        };
    };

    return (
        <div style={overlayStyle} onClick={onCancel}>
            {/* Global Styles for Keyframes */}
            <style jsx global>{`
                @keyframes scaleUp {
                    from { transform: scale(0.95) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>

            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={{
                        margin: 0,
                        fontFamily: 'serif',
                        fontSize: '32px',
                        fontWeight: 700
                    }}>Set Intention</h2>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none',
                            width: 32, height: 32, borderRadius: '50%', color: '#fff', fontSize: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >×</button>
                </div>

                <p style={{ marginBottom: 32, color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
                    Define your goal for this reading session.
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
                                >
                                    <div style={{
                                        width: 20, height: 20, borderRadius: '50%',
                                        border: isSelected ? '6px solid #0071E3' : '2px solid rgba(255,255,255,0.3)',
                                        backgroundColor: isSelected ? '#fff' : 'transparent',
                                        flexShrink: 0
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
                                border: custom ? '6px solid #0071E3' : '2px solid rgba(255,255,255,0.3)',
                                backgroundColor: custom ? '#fff' : 'transparent',
                                flexShrink: 0
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
                                    background: 'transparent', border: 'none', color: '#fff', fontSize: '17px',
                                    width: '100%', outline: 'none', padding: 0
                                }}
                                onFocus={() => setSelected('')}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
                        <button type="button" onClick={onCancel} style={{
                            background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none',
                            padding: '14px 24px', borderRadius: 99, fontWeight: 600, cursor: 'pointer', fontSize: 15
                        }}>Cancel</button>
                        <button type="submit" style={{
                            background: '#fff', color: '#000', border: 'none',
                            padding: '14px 32px', borderRadius: 99, fontWeight: 700, cursor: 'pointer', fontSize: 15,
                            boxShadow: '0 4px 12px rgba(255,255,255,0.2)'
                        }}>Enter Room</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
