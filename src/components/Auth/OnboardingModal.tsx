
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './Auth.module.css'; // Reusing Auth styles for consistency

export const OnboardingModal = () => {
    const { completeProfile } = useAuth();
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState<string>(''); // 'male' | 'female' | 'other'
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username || username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }
        if (!gender) {
            setError("Please select a gender identity.");
            return;
        }

        setLoading(true);
        const { error: profileError } = await completeProfile(username, gender);

        if (profileError) {
            setError(profileError.message);
            setLoading(false);
        } else {
            // Success handled by AuthContext (redirect or state update)
            window.location.href = '/dashboard'; // Force redirect to be safe
        }
    };

    return (
        <div className={styles.overlay} style={{ zIndex: 9999 }}>
            <div className={styles.modal} style={{ maxWidth: '400px' }}>
                <h2 className={styles.title}>Welcome to Libro</h2>
                <p className={styles.subtitle} style={{ marginBottom: '20px' }}>
                    To enter the sanctuary, please choose a pseudonym and identity.
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.inputGroup}>
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="e.g. QuietReader"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} // No spaces
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Identity (for Avatar)</label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setGender('male')}
                                className={styles.button}
                                style={{
                                    flex: 1,
                                    background: gender === 'male' ? '#333' : '#f5f5f5',
                                    color: gender === 'male' ? '#fff' : '#333',
                                    border: '1px solid #ddd'
                                }}
                            >
                                Male
                            </button>
                            <button
                                type="button"
                                onClick={() => setGender('female')}
                                className={styles.button}
                                style={{
                                    flex: 1,
                                    background: gender === 'female' ? '#333' : '#f5f5f5',
                                    color: gender === 'female' ? '#fff' : '#333',
                                    border: '1px solid #ddd'
                                }}
                            >
                                Female
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={loading}
                        style={{ marginTop: '20px' }}
                    >
                        {loading ? 'Creating Profile...' : 'Enter Sanctuary'}
                    </button>
                </form>
            </div>
        </div>
    );
};
