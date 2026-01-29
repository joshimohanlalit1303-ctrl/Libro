"use client";

import React from 'react';

const FRAGMENTS = [
    { text: "If you’re reading this, you stayed longer than most.", author: "Anonymous" },
    { text: "Some books find you only at night.", author: "The Night Reader" },
    { text: "This line was underlined at 2:07 AM.", author: "Unknown" },
    { text: "We read to know we are not alone.", author: "C.S. Lewis" }, // Classic nod
    { text: "To define is to kill. To suggest is to create.", author: "Stéphane Mallarmé" }
];

export const Fragments: React.FC = () => {
    // Pick a random fragment on mount (ssr safe?)
    // Actually, just picking one for now.
    const fragment = FRAGMENTS[Math.floor(Math.random() * FRAGMENTS.length)];

    return (
        <div style={{
            marginTop: '2rem',
            padding: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            textAlign: 'center',
            animation: 'fadeIn 2s ease-out'
        }}>
            <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.1rem',
                color: 'var(--foreground)',
                marginBottom: '0.5rem',
                lineHeight: '1.6'
            }}>
                "{fragment.text}"
            </p>
            <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }}>
                — {fragment.author}
            </span>
        </div>
    );
};
