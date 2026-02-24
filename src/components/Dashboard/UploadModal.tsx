'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './UploadModal.module.css';

// epubjs will be imported dynamically

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface BookMetadata {
    file: File;
    title: string;
    author: string;
    coverUrl: string | null;
    coverBlob: Blob | null;
    status: UploadStatus;
    message?: string;
}

interface UploadModalProps {
    onClose: () => void;
    onUploadComplete?: () => void;
}

export function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
    const [books, setBooks] = useState<BookMetadata[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsProcessing(true);
        const newBooks: BookMetadata[] = [];
        const files = Array.from(e.target.files);

        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.epub')) continue;

            try {
                console.log('Processing file:', file.name);
                // @ts-ignore
                const ePub = (await import('epubjs')).default;
                console.log('ePub loaded:', ePub);
                const book = ePub(await file.arrayBuffer());
                console.log('Book object created');
                const metadata = await book.loaded.metadata;
                console.log('Metadata loaded:', metadata);
                const coverUrl = await book.coverUrl();

                let coverBlob = null;
                if (coverUrl) {
                    const resp = await fetch(coverUrl);
                    coverBlob = await resp.blob();
                }

                newBooks.push({
                    file,
                    title: metadata.title || file.name.replace('.epub', ''),
                    author: metadata.creator || 'Unknown Author',
                    coverUrl: coverUrl || null,
                    coverBlob: coverBlob,
                    status: 'idle',
                });
            } catch (err) {
                console.error(`Error parsing ${file.name}:`, err);
                newBooks.push({
                    file,
                    title: file.name.replace('.epub', ''),
                    author: 'Unknown Author',
                    coverUrl: null,
                    coverBlob: null,
                    status: 'idle',
                    message: 'Metadata extraction failed',
                });
            }
        }

        setBooks((prev) => [...prev, ...newBooks]);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadBook = async (index: number) => {
        const book = books[index];
        if (book.status === 'success' || book.status === 'uploading') return;

        setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'uploading' } : b));

        try {
            // 0. Check for duplicates
            const { data: existingBooks } = await supabase
                .from('books')
                .select('id')
                .ilike('title', book.title)
                .ilike('author', book.author);

            if (existingBooks && existingBooks.length > 0) {
                setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'error', message: 'Duplicate: Book already exists' } : b));
                return;
            }

            // 1. Upload Epub (via Proxy)
            const epubPath = `public/${Date.now()}_${book.file.name.replace(/[^a-z0-9.]/gi, '_')}`;

            const formData = new FormData();
            formData.append('file', book.file);
            formData.append('bucket', 'books');
            formData.append('path', epubPath);

            const epubUploadResp = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!epubUploadResp.ok) {
                const err = await epubUploadResp.json();
                throw new Error(err.error || 'Upload failed');
            }

            const { publicUrl: epubPublicUrl } = await epubUploadResp.json();

            // 2. Upload Cover (if exists) - Use Proxy too just in case
            let coverPublicUrl = null;
            if (book.coverBlob) {
                const coverPath = `covers/${Date.now()}_${book.title.replace(/[^a-z0-9]/gi, '_')}.jpg`;

                const coverFormData = new FormData();
                coverFormData.append('file', book.coverBlob);
                coverFormData.append('bucket', 'books');
                coverFormData.append('path', coverPath);

                const coverUploadResp = await fetch('/api/upload', {
                    method: 'POST',
                    body: coverFormData
                });

                if (coverUploadResp.ok) {
                    const { publicUrl } = await coverUploadResp.json();
                    coverPublicUrl = publicUrl;
                }
            }

            // 3. Insert into DB
            const { error: dbError } = await supabase
                .from('books')
                .insert({
                    title: book.title,
                    author: book.author,
                    epub_url: epubPublicUrl,
                    cover_url: coverPublicUrl,
                });

            if (dbError) throw dbError;

            setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'success' } : b));
            if (onUploadComplete) onUploadComplete();

        } catch (error: any) {
            console.error("Upload error:", error);
            setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'error', message: error.message } : b));
        }
    };

    const uploadAll = async () => {
        books.forEach((_, i) => uploadBook(i));
    };

    const removeBook = (index: number) => {
        setBooks(prev => prev.filter((_, i) => i !== index));
    };

    const updateMetadata = (index: number, field: 'title' | 'author', value: string) => {
        setBooks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                <div className={styles.header}>
                    <h2>Upload Books</h2>
                    <button
                        onClick={onClose}
                        className={styles.closeBtn}
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.uploadArea}>
                    <input
                        type="file"
                        multiple
                        accept=".epub"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                        className={styles.fileInput}
                        id="modal-file-upload"
                        disabled={isProcessing}
                    />
                    <div className={styles.uploadLabel}>
                        <span className={styles.uploadBtn}>
                            {isProcessing ? 'Processing...' : 'Select Epubs'}
                        </span>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 10 }}>
                            Supports .epub files
                        </div>
                    </div>
                </div>

                {books.length > 0 && (
                    <div>
                        <div className={styles.queueHeader}>
                            <h3 className="text-lg font-medium text-gray-200">Processing Queue ({books.length})</h3>
                            <button
                                onClick={uploadAll}
                                className={styles.uploadAllBtn}
                            >
                                Upload All
                            </button>
                        </div>

                        <div className={styles.bookList}>
                            {books.map((book, idx) => (
                                <div key={idx} className={styles.bookItem}>
                                    <div className={styles.cover}>
                                        {book.coverUrl ? (
                                            <img src={book.coverUrl} alt="Cover" />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 10 }}>No Cover</div>
                                        )}
                                    </div>

                                    <div className={styles.details}>
                                        <div className={styles.inputGroup}>
                                            <div>
                                                <input
                                                    value={book.title}
                                                    onChange={(e) => updateMetadata(idx, 'title', e.target.value)}
                                                    className={styles.input}
                                                    placeholder="Title"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    value={book.author}
                                                    onChange={(e) => updateMetadata(idx, 'author', e.target.value)}
                                                    className={styles.input}
                                                    placeholder="Author"
                                                />
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                            {book.file.name} • {(book.file.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                        {book.message && (
                                            <div style={{ color: '#ffb300', fontSize: 12 }}>
                                                {book.message}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.status}>
                                        {book.status === 'idle' && (
                                            <button
                                                onClick={() => removeBook(idx)}
                                                className={styles.removeBtn}
                                            >
                                                Remove
                                            </button>
                                        )}
                                        {book.status === 'uploading' && (
                                            <span style={{ color: '#60a5fa', fontSize: 13 }}>Uploading...</span>
                                        )}
                                        {book.status === 'success' && (
                                            <span style={{ color: '#4ade80', fontSize: 13 }}>Done</span>
                                        )}
                                        {book.status === 'error' && (
                                            <span style={{ color: '#f87171', fontSize: 13 }}>Error</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.closeFooter}>
                            <button onClick={onClose} className={styles.closeFooterBtn}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
