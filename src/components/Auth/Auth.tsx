import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './Auth.module.css';

export const Auth: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
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
                const { error } = await signIn(email, password);
                if (error) throw error;
            } else {
                const { error, message, userExists } = await signUp(email, password, username);

                if (userExists) {
                    setError("User already registered. Switch to Login...");
                    setTimeout(() => {
                        setMode('login');
                        setError(null);
                    }, 1500);
                    return;
                }

                if (error) throw error;
                if (message) {
                    setSuccess(message);
                    setMode('login'); // Switch to login view so they can sign in after verifying
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className={styles.card} style={embedded ? { boxShadow: 'none', border: 'none', padding: 0, background: 'transparent' } : undefined}>
            <h2 className={styles.title}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className={styles.subtitle}>
                {mode === 'login' ? 'Enter your credentials to access the room.' : 'Join the book club today.'}
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

                <button type="submit" className={styles.button} disabled={loading}>
                    {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
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
                    {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
            </div>
        </div>
    );

    if (embedded) return content;

    return (
        <div className={styles.container}>
            {content}
        </div>
    );
};
