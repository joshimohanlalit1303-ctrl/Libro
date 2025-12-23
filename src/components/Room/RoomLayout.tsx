import React, { ReactNode } from 'react';
import styles from './RoomLayout.module.css';

interface RoomLayoutProps {
    header: ReactNode;
    sidebar: ReactNode;
    children: ReactNode;
    isSidebarOpen: boolean;
}

export const RoomLayout: React.FC<RoomLayoutProps> = ({ header, sidebar, children, isSidebarOpen }) => {
    return (
        <div className={styles.container} style={{
            gridTemplateColumns: isSidebarOpen ? '1fr 320px' : '100%',
            gridTemplateAreas: isSidebarOpen ? '"header header" "main sidebar"' : '"header" "main"',
            overflowX: 'hidden'
        }}>
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
