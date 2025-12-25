"use client";

import React from 'react';

export default function ChristmasLights() {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '20px',
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            pointerEvents: 'none',
            zIndex: 99, /* Below Header z-index 100 but above content */
            overflow: 'hidden'
        }}>
            {Array.from({ length: 40 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: i % 3 === 0 ? '#ff3b30' : i % 3 === 1 ? '#4cd964' : '#ffcc00', /* Red, Green, Gold */
                        boxShadow: `0 2px 10px ${i % 3 === 0 ? '#ff3b30' : i % 3 === 1 ? '#4cd964' : '#ffcc00'}`,
                        animation: 'twinkle 2s infinite ease-in-out',
                        animationDelay: `${Math.random() * 2}s`,
                        transform: `translateY(${Math.sin(i) * 5 + 5}px)`
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.6; transform: scale(0.9) translateY(5px); }
                    50% { opacity: 1; transform: scale(1.1) translateY(5px); box-shadow: 0 4px 15px currentColor;}
                }
            `}</style>
        </div>
    );
}
