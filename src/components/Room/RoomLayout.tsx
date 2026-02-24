import React, { ReactNode } from 'react';
import styles from './RoomLayout.module.css';

interface RoomLayoutProps {
    header: ReactNode;
    sidebar: ReactNode;
    children: ReactNode;
    isSidebarOpen: boolean;
}

export const RoomLayout: React.FC<RoomLayoutProps & { isFocusMode?: boolean, theme?: 'light' | 'sepia' | 'dark' }> = ({ header, sidebar, children, isSidebarOpen, isFocusMode = false, theme = 'light' }) => {
    return (
        <div className={`
            ${styles.container} 
            ${!isSidebarOpen ? styles.collapsed : ''} 
            ${isFocusMode ? styles.focusMode : ''}
        `}>
            <header className={styles.header}>
                {header}
            </header>
            <main className={styles.main}>
                {children}
            </main>
            {isSidebarOpen && (
                <aside className={styles.sidebar}>
                    {sidebar}
                </aside>
            )}
        </div>
    );
};
