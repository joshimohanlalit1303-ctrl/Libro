import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './Auth.module.css'; // Reusing Auth styles for consistency

export const CompleteProfile: React.FC = () => {
    const { completeProfile, user } = useAuth();
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState('unspecified');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!username.trim()) {
            setError("Username is required.");
            setLoading(false);
            return;
        }

        const { error } = await completeProfile(username, gender);
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Force reload to pick up new profile data in Dashboard/Context
            window.location.reload();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <h2 className={styles.title}>One Final Step</h2>
                <p className={styles.subtitle}>
                    Choose a name to be known by in the library.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="j_gatsby"
                            autoFocus
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Gender (for avatar)</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className={styles.selectInput}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                color: 'inherit'
                            }}
                        >
                            <option value="unspecified">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Non-binary / Other</option>
                        </select>
                    </div>

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? 'Entering...' : 'Enter the Library'}
                    </button>
                </form>
            </div>
        </div>
    );
};
