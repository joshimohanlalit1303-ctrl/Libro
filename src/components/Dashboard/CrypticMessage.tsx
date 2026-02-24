"use client";

import React, { useState, useEffect } from 'react';

const MESSAGES = [
    "Someone finished Chapter 7 at 3:14 AM.",
    "Few readers continue beyond this point.",
    "This paragraph made people pause.",
    "A room was closed quietly.",
    "You are not the only one here.",
    "Silence is the loudest sound.",
    "A reader paused on page 42.",
    "The night is young for stories."
];

export const CrypticMessage: React.FC = () => {
    const [index, setIndex] = useState(0);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            // Fade Out
            setOpacity(0);

            setTimeout(() => {
                // Change Message & Fade In
                setIndex(prev => (prev + 1) % MESSAGES.length);
                setOpacity(1);
            }, 1000); // Wait for fade out

        }, 8000); // Rotate every 8 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-serif)',
            fontSize: '0.9rem',
            fontStyle: 'italic',
            opacity: opacity,
            transition: 'opacity 1s ease-in-out',
            height: '24px', // Prevent layout shift
            marginTop: '1rem',
            marginBottom: '1rem'
        }}>
            {MESSAGES[index]}
        </div>
    );
};
