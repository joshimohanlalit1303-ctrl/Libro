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
    const [gender, setGender] = useState('');
    const [inviteCode, setInviteCode] = useState(''); // [NEW] Invite Code State
    const [inviteValid, setInviteValid] = useState(false);
    const [checkingInvite, setCheckingInvite] = useState(false);
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

                // [FIX] Embedded mode: Keep loading true to show feedback.
                // AuthContext listener will update 'user', causing RoomView to unmount this Auth component.
                if (embedded) {
                    // Safety fallback: If context doesn't update in 3s, reload.
                    // This handles rare edge cases where the socket hangs.
                    setTimeout(() => window.location.reload(), 3000);
                    return;
                }
            } else {
                // SignUp Logic

                // 1. Double check invite code if not already validated (though UI might force specific flow)
                // For robustness, validation happens before this block usually, or we rely on backend.
                // But let's assume validation passed or we re-verify.

                const { error, message, userExists } = await signUp(email, password, username, gender, inviteCode);

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
            setLoading(false); // Only stop loading on error
        } finally {
            if (mode === 'signup') {
                setLoading(false);
            }
        }
    };

    const content = (
        <div className={styles.card} style={embedded ? { boxShadow: 'none', border: 'none', padding: 0, background: 'transparent' } : undefined}>
            <h2 className={styles.title}>
                {mode === 'login' ? 'Welcome Back' : 'Join Libro'}
            </h2>
            <p className={styles.subtitle}>
                {mode === 'login' ? 'Enter your credentials to access the room.' : 'Join the book club today.'}
            </p>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
                {mode === 'signup' && (
                    <>
                        {/* Invitation Code Section - Optional */}
                        <div className={styles.inputGroup} style={{ marginBottom: 20 }}>
                            <label style={{ color: '#fcd34d' }}>Invitation Code <span style={{ fontSize: 10, opacity: 0.7, color: '#aaa' }}>(Optional)</span> {inviteValid && '✨'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={inviteCode}
                                    onChange={(e) => {
                                        setInviteCode(e.target.value.toUpperCase());
                                        setInviteValid(false); // Reset on change
                                        setError(null);
                                    }}
                                    placeholder="HAVE A CODE?"
                                    style={{
                                        fontFamily: 'monospace',
                                        letterSpacing: '2px',
                                        border: inviteValid ? '1px solid #4ade80' : '1px dashed #555',
                                        background: 'rgba(0,0,0,0.3)',
                                        color: '#fff',
                                        fontWeight: 'bold'
                                    }}
                                />
                                {inviteCode.length > 3 && !inviteValid && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setCheckingInvite(true);
                                            // Call RPC
                                            const { data: isValid } = await supabase.rpc('check_invite_code', { code_check: inviteCode });
                                            setCheckingInvite(false);

                                            if (isValid) {
                                                setInviteValid(true);
                                            } else {
                                                setError("Invalid Code (You can leave it empty to skip)");
                                            }
                                        }}
                                        disabled={checkingInvite}
                                        style={{
                                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                            fontSize: 10, padding: '4px 8px', borderRadius: 4,
                                            background: '#fcd34d', color: '#000', border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        {checkingInvite ? 'CHECKING...' : 'VALIDATE'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Always show rest of form */}
                        <div style={{
                            opacity: 1,
                            pointerEvents: 'auto',
                            transition: 'opacity 0.5s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}>

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

                            <div className={styles.inputGroup}>
                                <label>Gender</label>
                                <select
                                    value={gender} // Define state first
                                    onChange={(e) => setGender(e.target.value)}
                                    required
                                    className={styles.selectInput} // Will add this class
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '14px 16px',
                                        color: '#fff',
                                        fontSize: '16px',
                                        outline: 'none',
                                        appearance: 'none', // Remove default arrow
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="" disabled>Select Gender</option>
                                    <option value="male" style={{ color: '#000' }}>Male</option>
                                    <option value="female" style={{ color: '#000' }}>Female</option>
                                    <option value="other" style={{ color: '#000' }}>Non-binary / Other</option>
                                </select>
                            </div>
                        </div>
                    </>
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

                <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>

                <button
                    type="button"
                    onClick={async () => {
                        setLoading(true);
                        await signInWithGoogle();
                        // Redirect happens automatically
                    }}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#fff',
                        color: '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                    {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
            </div>
        </div >
    );

    if (embedded) return content;

    return (
        <div className={styles.container}>
            {/* Left Side: Hero / Brand */}
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>Libro</h1>
                    <p>Your digital sanctuary for focused reading and meaningful discussion.</p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className={styles.formSection}>
                {onBack && (
                    <button onClick={onBack} className={styles.backButton}>
                        ← Back to Home
                    </button>
                )}
                {content}
            </div>
        </div>
    );
};
