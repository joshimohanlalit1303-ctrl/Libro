import React, { ReactNode } from 'react';
import styles from './RoomLayout.module.css';

interface RoomLayoutProps {
    header: ReactNode;
    sidebar: ReactNode;
    children: ReactNode;
}

export const RoomLayout: React.FC<RoomLayoutProps> = ({ header, sidebar, children }) => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                {header}
            </header>
            <main className={styles.main}>
                {children}
            </main>
            <aside className={styles.sidebar}>
                {sidebar}
            </aside>
        </div>
    );
};
