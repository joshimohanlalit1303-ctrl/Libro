"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');

    // Time-Based Auto-Switch Logic REMOVED per user request
    // We now rely solely on manual toggle or stored preference (if added later).
    /*
    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const hour = now.getHours();

            // Night Mode: 7 PM (19) to 6 AM (6)
            // You can adjust these hours as needed
            const isNight = hour >= 19 || hour < 6;

            // Optional: Check system preference? 
            // For now, adhere to explicit "Day vs Night" sanctuary rule.

            if (isNight) {
                setTheme('dark');
                document.documentElement.classList.add('dark');
            } else {
                setTheme('light');
                document.documentElement.classList.remove('dark');
            }
        };

        // Check on mount
        checkTime();

        // Check every minute
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);
    */

    // Manual Toggle (Optional override for session)
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
