import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import styles from './Auth.module.css';

export const Auth: React.FC<{ embedded?: boolean; onBack?: () => void }> = ({ embedded, onBack }) => {
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    // Removed Gender and Invite Code states

    // Microcopy for "Mystery" element
    const [microcopyIndex, setMicrocopyIndex] = useState(0);
    const microcopyLines = [
        "Silence is shared here.",
        "Enter quietly.",
        "A sanctuary for attention."
    ];

    // Rotate microcopy
    React.useEffect(() => {
        const interval = setInterval(() => {
            setMicrocopyIndex((prev) => (prev + 1) % microcopyLines.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (mode === 'login') {
                // RITUAL: Wait for threshold animation (1200ms)
                await new Promise(resolve => setTimeout(resolve, 1200));

                const { error } = await signIn(email, password);
                if (error) throw error;

                if (embedded) {
                    setTimeout(() => window.location.reload(), 500);
                    return;
                }
            } else {
                // SignUp Logic - Simplified
                // Defaulting gender to 'unspecified' or handling it in backend if needed, 
                // but for now we just omit it from the UI.
                const { error, message, userExists } = await signUp(email, password, username, 'unspecified', '');

                if (userExists) {
                    setError("Account exists. Please sign in.");
                    setTimeout(() => {
                        setMode('login');
                        setError(null);
                    }, 1500);
                    return;
                }

                if (error) throw error;
                if (message) {
                    setSuccess(message);
                    setMode('login');
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setLoading(false);
        } finally {
            if (mode === 'signup') {
                setLoading(false);
            }
        }
    };

    const content = (
        <div className={`${styles.card} ${loading && mode === 'login' ? styles.entering : ''}`} style={embedded ? { boxShadow: 'none', border: 'none', padding: 0, background: 'transparent' } : undefined}>
            <h2 className={styles.title}>
                {mode === 'login' ? 'Welcome Back' : 'Join Libro'}
            </h2>
            <p className={styles.subtitle}>
                {mode === 'login' ? (
                    // Reading Memory Mockup
                    <span>Last time, you were reading quietly.<br />Your space awaits.</span>
                ) : 'Begin a slower, deeper way of reading.'}
            </p>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
                {mode === 'signup' && (
                    <div className={styles.inputGroup}>
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="j_gatsby"
                        />
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="jay@westegg.com"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>

                <button type="submit" className={styles.button} disabled={loading && mode !== 'login'}>
                    {/* Don't show generic 'Processing' text during ritual entry, keep button bare or show text if not login */}
                    {loading && mode === 'login' ? '' : (mode === 'login' ? (<span>Enter the Library &rarr;</span>) : 'Begin Reading')}
                </button>

                <div className={styles.divider}>
                    <div className={styles.dividerLine}></div>
                    <span className={styles.dividerText}>or</span>
                    <div className={styles.dividerLine}></div>
                </div>

                <button
                    type="button"
                    onClick={async () => {
                        setLoading(true);
                        await signInWithGoogle();
                    }}
                    className={styles.googleButton}
                    disabled={loading}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fillRule="evenodd" fillOpacity="1" fill="#4285F4" stroke="none"></path>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fillRule="evenodd" fillOpacity="1" fill="#34A853" stroke="none"></path>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fillRule="evenodd" fillOpacity="1" fill="#FBBC05" stroke="none"></path>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fillRule="evenodd" fillOpacity="1" fill="#EA4335" stroke="none"></path>
                    </svg>
                    Continue with Google
                </button>
            </form>

            <div className={styles.footer}>
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                    className={styles.linkButton}
                    onClick={() => {
                        setMode(mode === 'login' ? 'signup' : 'login');
                        setError(null);
                        setSuccess(null);
                    }}
                >
                    {mode === 'login' ? 'Join Libro' : 'Sign in'}
                </button>
            </div>

            {/* Living Microcopy - Moved to corner */}
            <div className={styles.microcopy}>
                {microcopyLines[microcopyIndex]}
            </div>
        </div >
    );

    if (embedded) return content;

    return (
        <div className={styles.container}>
            {/* Left Side: Hero / Brand */}
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    {/* Rotating Mystery Text in Hero */}
                    <div className={styles.heroOverlayText}>
                        {["A page was turned moments ago.", "Someone is reading quietly.", "Silence lives here."][microcopyIndex % 3]}
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className={styles.formSection}>
                {onBack && (
                    <button onClick={onBack} className={styles.backButton}>
                        &larr; Return
                    </button>
                )}
                {content}
            </div>
        </div>
    );
};
