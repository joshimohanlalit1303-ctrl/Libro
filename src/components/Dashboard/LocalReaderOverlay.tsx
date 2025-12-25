"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from './LocalReader.module.css';

const ReactReader = dynamic(() => import('react-reader').then((mod) => mod.ReactReader), { ssr: false });

interface LocalReaderOverlayProps {
    file: File;
    onClose: () => void;
}

export default function LocalReaderOverlay({ file, onClose }: LocalReaderOverlayProps) {
    const [location, setLocation] = useState<string | number>(0);
    const [url, setUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'epub' | 'pdf' | 'unknown'>('unknown');

    useEffect(() => {
        if (!file) return;

        // Create Object URL for the file (Client-side only, no upload)
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);

        // Determine type
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            setFileType('pdf');
        } else if (file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub')) {
            setFileType('epub');
        } else {
            setFileType('unknown');
        }

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    if (!url) return null;

    return (
        <div className={styles.overlay}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.badge}>LOCAL FILE</span>
                </div>
                <button onClick={onClose} className={styles.closeBtn}>Close</button>
            </header>

            <div className={styles.content}>
                {fileType === 'epub' && (
                    <div style={{ height: '100%', width: '100%' }}>
                        <ReactReader
                            url={url}
                            location={location}
                            locationChanged={(epubcifi: string | number) => setLocation(epubcifi)}
                            epubOptions={{
                                flow: "paginated",
                                manager: "default",
                            }}
                            getRendition={(rendition: any) => {
                                rendition.themes.fontSize("100%");
                            }}
                        />
                    </div>
                )}

                {fileType === 'pdf' && (
                    <iframe
                        src={url}
                        className={styles.pdfFrame}
                        title="PDF Reader"
                    />
                )}

                {fileType === 'unknown' && (
                    <div className={styles.error}>
                        <p>Unsupported file format.</p>
                        <p>Please upload an <strong>EPUB</strong> or <strong>PDF</strong>.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
