import React from 'react';
import styles from './MobileBlocker.module.css';

export const MobileBlocker = () => {
    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <span className={styles.icon}>💻</span>
                <h1 className={styles.title}>Desktop Experience Only</h1>
                <p className={styles.message}>
                    Hi there! <br />
                    To ensure the best reading and chat experience, this application is currently designed for desktop screens.
                    <br /><br />
                    Please visit us on your computer! ✨
                </p>
            </div>
        </div>
    );
};
