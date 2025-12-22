import React, { useState, useEffect } from 'react';
import styles from './CreateRoomModal.module.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ePub from 'epubjs';
import { LibraryView } from '../Library/LibraryView';

interface CreateRoomModalProps {
    onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [capacity, setCapacity] = useState('10');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');

    // Upload State
    const [file, setFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null); // For preview only
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    // Book Selection Handler
    const handleBookSelect = (book: any) => {
        setSelectedBookId(book.id);
        setName(book.title); // Auto-fill room name
        setDescription(book.author ? `Reading ${book.title} by ${book.author}` : `Reading ${book.title}`);
        setCoverUrl(book.cover_url);
        // stay on library tab but show selection
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setAnalyzing(true);
        setSelectedBookId(null); // Clear library selection

        try {
            // 1. Parse Metadata
            const arrayBuffer = await selectedFile.arrayBuffer();
            const book = ePub(arrayBuffer);
            const metadata = await book.loaded.metadata;

            if (metadata.title) setName(metadata.title);
            if (metadata.creator) setDescription(`By ${metadata.creator}`);

            // 2. extract cover
            const coverUrl = await book.coverUrl();
            if (coverUrl) {
                const response = await fetch(coverUrl);
                const blob = await response.blob();
                setCoverUrl(URL.createObjectURL(blob));
            }
        } catch (err) {
            console.error("Error parsing epub:", err);
        } finally {
            setAnalyzing(false);
        }
    };

    // Helper: Upload to storage
    const uploadToStorage = async (file: File) => {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { data, error } = await supabase.storage.from('books').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(fileName);
        return publicUrl;
    };

    const uploadCover = async () => {
        if (!coverUrl || !coverUrl.startsWith('blob:')) return coverUrl; // Return existing if not a blob
        try {
            const response = await fetch(coverUrl);
            const blob = await response.blob();
            const fileName = `cover-${Date.now()}.jpg`;
            const { error } = await supabase.storage.from('books').upload(fileName, blob);
            if (error) return null;
            const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(fileName);
            return publicUrl;
        } catch (e) {
            console.error("Failed to upload cover", e);
            return null;
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (activeTab === 'upload' && !file) {
            alert("Please select an ePub file");
            return;
        }
        if (activeTab === 'library' && !selectedBookId) {
            alert("Please select a book from the library");
            return;
        }

        setUploading(true);

        try {
            let finalBookId = selectedBookId;
            let finalEpubUrl = '';
            let finalCoverUrl = null;

            // Scenario 1: Upload New Book
            if (activeTab === 'upload' && file) {
                console.log("Uploading new book...");
                const epubUrl = await uploadToStorage(file);
                const remoteCoverUrl = await uploadCover();

                // Insert into 'books' library
                const { data: bookData, error: bookError } = await supabase.from('books').insert({
                    title: name,
                    author: description.replace('By ', ''), // rudimentary fallback
                    epub_url: epubUrl,
                    cover_url: remoteCoverUrl,
                    uploaded_by: user.id
                }).select().single();

                if (bookError) throw new Error(`Failed to save to library: ${bookError.message}`);

                finalBookId = bookData.id;
                finalEpubUrl = epubUrl;
                finalCoverUrl = remoteCoverUrl;
            } else {
                // Scenario 2: Existing Book (Need to fetch URL to duplicate in room? No, room should ref book)
                // Wait, Room Schema has 'epub_url' duplicated.
                // For now we will fetch details from 'books' to populate 'rooms'
                const { data: book } = await supabase.from('books').select('*').eq('id', selectedBookId).single();
                if (book) {
                    finalEpubUrl = book.epub_url;
                    finalCoverUrl = book.cover_url;
                }
            }

            // Generate Room Code (6 chars)
            const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Defensive: Ensure profile exists (fix for older users)
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_metadata?.username || user.email}`
            }, { onConflict: 'id', ignoreDuplicates: true });

            if (profileError) {
                console.warn("Profile sync warning:", profileError);
                // Proceed anyway, room creation might fail if fk is strictly enforced but worth a try or warning.
            }

            // Insert Room
            const { data, error } = await supabase.from('rooms').insert({
                name,
                description,
                book_id: finalBookId, // Now referencing real UUID from books
                epub_url: finalEpubUrl,
                cover_url: finalCoverUrl,
                max_participants: capacity === 'unlimited' ? null : parseInt(capacity),
                privacy,
                owner_id: user.id,
                access_code: accessCode
            }).select().single();

            if (error) throw error;

            if (data) {
                await supabase.from('participants').insert({
                    room_id: data.id,
                    user_id: user.id,
                    role: 'host'
                });
                router.push(`/room/${data.id}`);
            }

        } catch (err: any) {
            console.error("Creation Error:", err);
            alert(`Failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // Lazy load Library component only when needed? No, standard import is fine.
    // Importing LibraryView dynamically or just assuming it's imported at top.

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Start a Room</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <div className={styles.tabs}>
                    <button type="button" onClick={() => setActiveTab('upload')} className={`${styles.tab} ${activeTab === 'upload' ? styles.activeTab : ''}`}>
                        Upload New
                    </button>
                    <button type="button" onClick={() => setActiveTab('library')} className={`${styles.tab} ${activeTab === 'library' ? styles.activeTab : ''}`}>
                        From Library
                    </button>
                </div>

                <form onSubmit={handleCreate} style={{ marginTop: 20 }}>

                    {/* Mode 1: Upload */}
                    {activeTab === 'upload' && (
                        <div style={{ minHeight: 180, marginBottom: 20 }}>
                            <div className={styles.uploadSection}>
                                <div className={styles.uploadArea}>
                                    <input
                                        type="file"
                                        accept=".epub"
                                        onChange={handleFileSelect}
                                        id="epub-upload"
                                        className={styles.fileInput}
                                    />
                                    <label htmlFor="epub-upload" className={styles.uploadLabel}>
                                        {analyzing ? 'Analyzing Book...' : (file ? `Selected: ${file.name}` : 'Click to Upload .epub')}
                                    </label>
                                </div>
                                {coverUrl && <img src={coverUrl} className={styles.coverPreview} style={{ height: 100, marginLeft: 20 }} alt="preview" />}
                            </div>
                        </div>
                    )}

                    {/* Mode 2: Library */}
                    {activeTab === 'library' && (
                        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20, border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                            {/* @ts-ignore */}
                            <LibraryView onSelectBook={(book) => handleBookSelect(book)} />
                            {selectedBookId && <div style={{ marginTop: 10, color: '#0071e3' }}>✓ Selected Book</div>}
                        </div>
                    )}

                    <div className={styles.group}>
                        <label>Room Name</label>
                        <input
                            type="text"
                            placeholder="Reading Club #1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.group}>
                        <label>Description</label>
                        <textarea
                            placeholder="Reading..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label>Capacity</label>
                            <select value={capacity} onChange={e => setCapacity(e.target.value)}>
                                <option value="5">5 People</option>
                                <option value="10">10 People</option>
                                <option value="unlimited">Unlimited</option>
                            </select>
                        </div>
                        <div className={styles.group}>
                            <label>Privacy</label>
                            <select value={privacy} onChange={e => setPrivacy(e.target.value as any)}>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={uploading}>
                        {uploading ? 'Processing...' : (activeTab === 'upload' ? 'Upload & Create' : 'Create Room')}
                    </button>
                </form>
            </div>
        </div>
    );
};
