import React from 'react';
import styles from './SessionSummary.module.css';

interface SessionSummaryProps {
    durationSeconds: number;
    intention?: string;
    onClose: () => void;
    onDismiss?: () => void; // [NEW] Optional dismiss handler
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ durationSeconds, intention, onClose, onDismiss }) => {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {onDismiss && (
                    <button className={styles.closeButton} onClick={onDismiss} aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
                <span className={styles.icon}>🎓</span>
                <h2 className={styles.title}>Session Insight</h2>
                <p className={styles.subtitle}>
                    You've invested time in your growth. Here is a summary of your focus session.
                </p>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Focus Time</span>
                    <span className={styles.statValue}>
                        {minutes}m {seconds}s
                    </span>
                </div>

                {intention && (
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Original Intention</span>
                        <span className={styles.statValue}>
                            "{intention}"
                        </span>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className={styles.button}
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};
