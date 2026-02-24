
import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
    return (
        <footer style={{
            background: '#fafafa',
            borderTop: '1px solid #eaeaea',
            padding: '40px 0',
            marginTop: 'auto', // Pushes footer to bottom if flex container
            width: '100%'
        }}>
            <div style={{
                maxWidth: 1000,
                margin: '0 auto',
                padding: '0 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.8 }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>Libro</div>
                    <span style={{ color: '#ccc' }}>|</span>
                    <div style={{ fontSize: 14, color: '#666' }}>Read together.</div>
                </div>

                <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#666' }}>
                    <Link href="/dashboard" style={{ textDecoration: 'none', transition: 'color 0.2s' }}>Inventory</Link>
                    <Link href="/profile" style={{ textDecoration: 'none', transition: 'color 0.2s' }}>Profile</Link>
                    <a href="#" style={{ textDecoration: 'none', transition: 'color 0.2s', cursor: 'not-allowed', opacity: 0.5 }}>About</a>
                </div>

                <div style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
                    © {new Date().getFullYear()} Libro Inc. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
