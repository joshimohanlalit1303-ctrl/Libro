"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, username: string) => Promise<{ error: any, message?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            console.log("Auth: Checking session...");
            // Safety timeout in case getSession hangs
            const timeout = setTimeout(() => {
                console.warn("Auth: Session check timed out, forcing load completion.");
                setLoading(false);
            }, 5000);

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                clearTimeout(timeout);

                if (error) {
                    console.error("Auth: Error getting session:", error);
                    // Critical Fix: If refresh token is invalid, force sign out to clear stale state
                    if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
                        console.warn("Auth: Invalid refresh token detected. Forcing sign out.");
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                    }
                }

                if (session) {
                    console.log("Auth: Session found for", session.user.email);
                    setSession(session);
                    setUser(session.user);
                } else {
                    console.log("Auth: No active session found.");
                    setSession(null);
                    setUser(null);
                }
            } catch (err) {
                console.error("Auth: Unexpected error", err);
                setSession(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string, username: string) => {
        console.log("Attempting signup for", email);

        // Pre-check for unique username
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUser) {
            console.warn("Signup blocked: Username taken.", username);
            return { error: { message: "Username already taken. Please choose another." } };
        }

        // [FIX] Pre-check for unique email (using public profiles table to bypass Supabase security masking)
        const { data: existingEmail } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingEmail) {
            console.warn("Signup blocked: Email taken.", email);
            return { error: { message: "This email is already registered. Please sign in instead." } };
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                },
            },
        });

        if (error) {
            console.error("Signup error:", error);
            // Check for duplicate user error (Supabase specific)
            if (error.message?.includes("User already registered") || error.message?.includes("already registered")) {
                return { error: { message: "This email is already registered. Please sign in instead." } };
            }
            return { error };
        }

        if (data.user && !data.session) {
            console.log("Signup successful, email verification required.");
            // We can still try to create a profile even if session is pending, but RLS might block it.
            // Best to warn user.
            return { error: null, message: "Please check your email to verify your account." };
        }

        if (data.user && data.session) {
            console.log("Signup successful, creating profile...");
            // Create profile immediately
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: data.user.id,
                username: username,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
            });

            if (profileError) {
                console.error("Profile creation error:", profileError);
            }
        }

        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
