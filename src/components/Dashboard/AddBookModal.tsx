import React, { useState, useRef, useEffect } from 'react';
import styles from './CreateRoomModal.module.css'; // Reusing styles
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import ePub from 'epubjs';

interface AddBookModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();

    // Bulk State
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(newFiles);
            setLogs([`Selected ${newFiles.length} file(s). Ready to upload.`]);
            setProgress({ current: 0, total: newFiles.length });
        }
    };

    const uploadFileToStorage = async (file: Blob, path: string) => {
        const { error } = await supabase.storage.from('books').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(path);
        return publicUrl;
    };

    const processQueue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || files.length === 0) return;

        setUploading(true);
        setLogs(prev => [...prev, "--- Starting Batch Upload ---"]);

        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setProgress({ current: i + 1, total: files.length });
            setLogs(prev => [...prev, `Processing [${i + 1}/${files.length}]: ${file.name}...`]);

            try {
                // 1. Parse Metadata using epubjs
                const arrayBuffer = await file.arrayBuffer();
                const book = ePub(arrayBuffer);
                const metadata = await book.loaded.metadata;

                // Fallback to filename if title is missing, but Project Gutenberg usually has metadata
                const title = metadata.title || file.name.replace('.epub', '');
                const author = metadata.creator || 'Unknown Author';

                setLogs(prev => [...prev, `   📖 Found: "${title}" by ${author}`]);

                // 2. Extract and Upload Cover
                let remoteCoverUrl = null;
                const coverUrl = await book.coverUrl();
                if (coverUrl) {
                    const res = await fetch(coverUrl);
                    const blob = await res.blob();
                    const coverName = `cover-${Date.now()}-${i}.jpg`;
                    remoteCoverUrl = await uploadFileToStorage(blob, coverName);
                }

                // 3. Upload EPUB
                const epubName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                const remoteEpubUrl = await uploadFileToStorage(file, epubName);

                // 4. Insert into Database
                const { error } = await supabase.from('books').insert({
                    title,
                    author,
                    epub_url: remoteEpubUrl,
                    cover_url: remoteCoverUrl,
                    uploaded_by: user.id
                });

                if (error) throw error;

                setLogs(prev => [...prev, `   ✅ Success`]);
                successCount++;

            } catch (error: any) {
                console.error(error);
                setLogs(prev => [...prev, `   ❌ Failed: ${error.message}`]);
            }
        }

        setUploading(false);
        setLogs(prev => [...prev, `--- Batch Complete. Added ${successCount} books. ---`]);

        if (successCount > 0) {
            onSuccess(); // Triggers refresh in parent if needed
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: 600 }}>
                <div className={styles.header}>
                    <h2>Batch Upload Books</h2>
                    {!uploading && <button onClick={onClose} className={styles.closeBtn}>×</button>}
                </div>

                <form onSubmit={processQueue} style={{ marginTop: 20 }}>
                    <div style={{ marginBottom: 20 }}>
                        <div className={styles.uploadSection}>
                            <div className={styles.uploadArea}>
                                <input
                                    type="file"
                                    accept=".epub"
                                    multiple // Enable multiple files
                                    onChange={handleFileSelect}
                                    id="epub-upload-bulk"
                                    className={styles.fileInput}
                                    disabled={uploading}
                                />
                                <label htmlFor="epub-upload-bulk" className={styles.uploadLabel}>
                                    {files.length > 0
                                        ? `${files.length} files selected`
                                        : 'Click to Select multiple .epub files'}
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Progress Logs */}
                    <div style={{
                        background: '#f5f5f7',
                        borderRadius: 8,
                        padding: 12,
                        height: 200,
                        overflowY: 'auto',
                        marginBottom: 20,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        border: '1px solid #e1e1e1'
                    }}>
                        {logs.length === 0 && <span style={{ color: '#999' }}>Waiting to start...</span>}
                        {logs.map((log, idx) => (
                            <div key={idx} style={{ marginBottom: 4 }}>{log}</div>
                        ))}
                        <div ref={logEndRef} />
                    </div>

                    <div className={styles.row} style={{ justifyContent: 'flex-end' }}>
                        {files.length > 0 && !uploading && (
                            <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 13, color: '#666' }}>
                                Ready to process {files.length} books.
                            </span>
                        )}

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={uploading || files.length === 0}
                            style={{ width: 'auto', padding: '10px 24px' }}
                        >
                            {uploading
                                ? `Processing ${progress.current}/${progress.total}...`
                                : 'Start Batch Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
