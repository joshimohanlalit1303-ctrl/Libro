
import React from 'react';
import styles from './MusicMenu.module.css';

export interface Track {
    id: string;
    name: string;
    url: string;
    icon: React.ReactNode;
}

// Icons
const RainIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 13v8" /><path d="M8 13v8" /><path d="M12 15v8" /><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" /></svg>
);
const FireIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.115.385-2.256 1-3.24" /><path d="M12 14v4" /></svg>
);
const StreamIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2h-7a.5.5 0 0 0-.5.5v19a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V2.5a.5.5 0 0 0-.5-.5Z" /><path d="M13.84 21.05a2.26 2.26 0 0 0 3.78-2.61" /><path d="M13.84 5.56a2.26 2.26 0 0 1 3.78 2.61" /><path d="M13.84 10.73a2.26 2.26 0 0 0 3.78-2.61" /><path d="M13.84 15.89a2.26 2.26 0 0 1 3.78 2.61" /></svg> // Abstract stream/tree
);
const CafeIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" /></svg>
);
const OffIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2V15H6L11 19V5Z" /><line x1="23" x2="17" y1="9" y2="15" /><line x1="17" x2="23" y1="9" y2="15" /></svg>
); // Muted speaker

export const TRACKS: Track[] = [
    { id: 'rain', name: 'Heavy Rain', url: '/sounds/rain.mp3', icon: <RainIcon /> },
    { id: 'fire', name: 'Fireplace', url: '/sounds/fireplace.mp3', icon: <FireIcon /> },
    { id: 'stream', name: 'Forest Stream', url: '/sounds/forest.mp3', icon: <StreamIcon /> },
    { id: 'cafe', name: 'Coffee Shop', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg', icon: <CafeIcon /> },
];

interface MusicMenuProps {
    currentTrackId: string | null;
    onSelectTrack: (trackId: string | null) => void;
    onClose: () => void;
}

export const MusicMenu: React.FC<MusicMenuProps> = ({ currentTrackId, onSelectTrack, onClose }) => {
    return (
        <div className={styles.menuContainer}>
            <div className={styles.title}>Ambience</div>

            <div className={styles.trackList}>
                <button
                    className={`${styles.trackItem} ${currentTrackId === null ? styles.active : ''}`}
                    onClick={() => onSelectTrack(null)}
                >
                    <div className={styles.trackIcon}>
                        <OffIcon />
                    </div>
                    <span className={styles.trackName}>Off</span>
                    {currentTrackId === null && <span style={{ fontSize: '18px', lineHeight: 0 }}>•</span>}
                </button>

                {TRACKS.map(track => (
                    <button
                        key={track.id}
                        className={`${styles.trackItem} ${currentTrackId === track.id ? styles.active : ''}`}
                        onClick={() => onSelectTrack(track.id)}
                    >
                        <div className={styles.trackIcon}>
                            {track.icon}
                        </div>
                        <span className={styles.trackName}>{track.name}</span>

                        {currentTrackId === track.id && (
                            <div className={styles.playingIndicator}>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
