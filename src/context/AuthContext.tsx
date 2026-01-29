"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signUp: (email: string, password: string, username: string, gender: string, inviteCode: string) => Promise<{ error: any, message?: string, userExists?: boolean }>;
    completeProfile: (username: string, gender: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signInWithGoogle: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    completeProfile: async () => ({ error: null }),
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
                    // Critical Fix: If refresh token is invalid, force sign out to clear stale state
                    if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
                        console.warn("Auth: Invalid refresh token detected. Session expired. Logging out.");
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                    } else {
                        console.error("Auth: Error getting session:", error);
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

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        return { error };
    };

    const signUp = async (email: string, password: string, username: string, gender: string, inviteCode: string) => {
        console.log("Attempting signup for", email, gender, "with code:", inviteCode);

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

        // [FIX] Pre-check for unique email using Secure RPC (reliable)
        const { data: emailExists, error: rpcError } = await supabase
            .rpc('check_email_exists', { email_to_check: email });

        if (emailExists) {
            console.warn("Signup blocked: Email taken (RPC check).", email);
            return {
                error: { message: "User already exists." },
                userExists: true // Flag for UI to switch mode
            };
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    username: username,
                    gender: gender,
                    invite_code: inviteCode, // Pass code to metadata for trigger validation
                },
            },
        });

        if (error) {
            console.error("Signup error:", error);
            // Check for duplicate user error (Supabase specific)
            if (error.message?.includes("User already registered") || error.message?.includes("already registered")) {
                return { error: { message: "This email is already registered. Please sign in instead." } };
            }
            // Check for Rate Limit error
            if (error.message?.includes("Error sending confirmation email")) {
                return { error: { message: "Unable to send email. You may have hit the hourly signup limit. Please try again later." } };
            }
            return { error };
        }

        if (data.user && !data.session) {
            console.log("Signup successful, email verification required.");
            // We can still try to create a profile even if session is pending, but RLS might block it.
            return { error: null, message: "Please check your email to verify your account." };
        }

        if (data.user && data.session) {
            console.log("Signup successful, creating profile...");

            // Generate Gendered Avatar URL
            let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

            if (gender === 'male') {
                // Short hair, maybe facial hair
                const maleHair = [
                    'shortHair', 'shortHairDreads01', 'shortHairDreads02', 'shortHairFrizzle',
                    'shortHairShaggyMullet', 'shortHairShortCurly', 'shortHairShortFlat',
                    'shortHairShortRound', 'shortHairShortWaved', 'shortHairSides',
                    'shortHairTheCaesar', 'shortHairTheCaesarSidePart'
                ].join(',');
                avatarUrl += `&top=${maleHair}&facialHairProbability=50`;
            } else if (gender === 'female') {
                // Long hair, no facial hair
                const femaleHair = [
                    'longHair', 'longHairBob', 'longHairBun', 'longHairCurly', 'longHairCurvy',
                    'longHairDreads', 'longHairFrida', 'longHairFro', 'longHairFroBand',
                    'longHairMiaWallace', 'longHairNotTooLong', 'longHairShavedSides',
                    'longHairStraight', 'longHairStraight2', 'longHairStraightStrand'
                ].join(',');
                avatarUrl += `&top=${femaleHair}&facialHairProbability=0`;
            } else {
                // Neutral / Other (Default random)
                // Maybe ensure no beard if preferred, or just let it be random.
            }

            // Create profile immediately
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: data.user.id,
                username: username,
                avatar_url: avatarUrl
                // We don't store gender column yet, but it's in auth metadata if needed later
            });

            if (profileError) {
                console.error("Profile creation error:", profileError);
            }
        }

        return { error: null };
    };

    const completeProfile = async (username: string, gender: string) => {
        if (!user) return { error: { message: "No user logged in." } };

        // Check if username taken
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUser) {
            return { error: { message: "Username already taken." } };
        }

        // Generate Avatar
        let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

        if (gender === 'male') {
            const maleHair = [
                'shortHair', 'shortHairDreads01', 'shortHairDreads02', 'shortHairFrizzle',
                'shortHairShaggyMullet', 'shortHairShortCurly', 'shortHairShortFlat',
                'shortHairShortRound', 'shortHairShortWaved', 'shortHairSides',
                'shortHairTheCaesar', 'shortHairTheCaesarSidePart'
            ].join(',');
            avatarUrl += `&top=${maleHair}&facialHairProbability=50`;
        } else if (gender === 'female') {
            const femaleHair = [
                'longHair', 'longHairBob', 'longHairBun', 'longHairCurly', 'longHairCurvy',
                'longHairDreads', 'longHairFrida', 'longHairFro', 'longHairFroBand',
                'longHairMiaWallace', 'longHairNotTooLong', 'longHairShavedSides',
                'longHairStraight', 'longHairStraight2', 'longHairStraightStrand'
            ].join(',');
            avatarUrl += `&top=${femaleHair}&facialHairProbability=0`;
        }

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            username: username,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        });

        if (!error) {
            // Refresh local session/user state if needed, mostly handled by realtime or simple state update?
            // Force reload or just let the dashboard pick it up.
            // setSession(prev => ({...prev!})); 
            // Better to reload window to ensure context is fresh? Or just return success.
        }

        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signInWithGoogle, signUp, completeProfile, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
