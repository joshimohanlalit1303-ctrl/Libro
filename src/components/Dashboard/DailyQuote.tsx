"use client";

import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

const QUOTES = [
    { text: "So we beat on, boats against the current, borne back ceaselessly into the past.", author: "F. Scott Fitzgerald" },
    { text: "It was the best of times, it was the worst of times.", author: "Charles Dickens" },
    { text: "All happy families are alike; each unhappy family is unhappy in its own way.", author: "Leo Tolstoy" },
    { text: "Who, being loved, is poor?", author: "Oscar Wilde" },
    { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
    { text: "We read to know we are not alone.", author: "C.S. Lewis" }
];

export const DailyQuote = () => {
    const [quote, setQuote] = useState(QUOTES[0]);

    useEffect(() => {
        // Simple day-based rotation
        const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        setQuote(QUOTES[dayOfYear % QUOTES.length]);
    }, []);

    return (
        <div className={styles.quoteCard}>
            <div className={styles.cardHeader}>
                <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 0 }}>Daily Inspiration</h3>
            </div>
            <div style={{ marginTop: 24 }}>
                <p style={{
                    fontFamily: 'var(--font-playfair), serif',
                    fontSize: 22,
                    lineHeight: 1.4,
                    fontWeight: 500,
                    fontStyle: 'italic',
                    color: 'rgba(255, 255, 255, 0.95)',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}>
                    "{quote.text}"
                </p>
                <div style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', textAlign: 'right', letterSpacing: 0.5 }}>
                    — {quote.author}
                </div>
            </div>
        </div>
    );
};
