import React, { useState } from 'react';
import styles from './Sidebar.module.css'; // Reusing for now or create new
import { useAnnotations } from '@/hooks/useAnnotations';
import { useAuth } from '@/context/AuthContext';

interface AnnotationsTabProps {
    roomId: string;
}

export const AnnotationsTab: React.FC<AnnotationsTabProps> = ({ roomId }) => {
    const { user } = useAuth();
    const { annotations, addAnnotation } = useAnnotations(roomId);
    const [note, setNote] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim() || !user) return;

        // Hardcoded page 24 for demo, ideally get this from Reader context
        await addAnnotation(user.id, note, 24);
        setNote('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className={styles.content} style={{ overflowY: 'auto' }}>
                <div className={styles.annotationList}>
                    {annotations.map(ann => (
                        <div key={ann.id} className={styles.annotationItem}>
                            <div className={styles.annotationHeader}>
                                <span>{ann.user?.username}</span>
                                <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className={styles.annotationNote}>{ann.note}</div>
                        </div>
                    ))}
                    {annotations.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>No notes yet.</p>
                    )}
                </div>
            </div>

            <form className={styles.addNoteForm} onSubmit={handleAdd}>
                <input
                    className={styles.addNoteInput}
                    placeholder="Add a note..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                />
                <button type="submit" className={styles.addNoteBtn}>+</button>
            </form>
        </div>
    );
};
