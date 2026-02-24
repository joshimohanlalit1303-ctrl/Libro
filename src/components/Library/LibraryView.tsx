import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './Library.module.css';

import { useAuth } from '@/context/AuthContext'; // [FIX] Import Auth

interface Book {
    id: string;
    title: string;
    author: string;
    cover_url: string;
    epub_url: string;
    uploaded_by?: string | null; // Added field
}

interface LibraryViewProps {
    onSelectBook?: (book: Book) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onSelectBook }) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBooks = async () => {
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                // [FIX] Strict Filtering
                const officialBooks = data.filter((b: Book) => {
                    // 1. Removed aggressive "User Upload" filter so System books (with IDs) show up.

                    // 2. Hard-Hide specific "Orphan" books to clean up UI
                    if (b.title === 'Why I Am a Hindu') return false;

                    return true;
                });
                setBooks(officialBooks);
            }
            setLoading(false);
        };
        fetchBooks();
    }, []);

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className={styles.loading}>Loading Library...</div>;

    return (
        <div>
            {/* Search Bar */}
            <div className={styles.searchBar}>
                <input
                    type="text"
                    placeholder="Search library..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.grid}>
                {filteredBooks.length === 0 && (
                    <div className={styles.empty}>
                        {searchTerm ? 'No books match your search.' : 'No books in the library yet. Upload one!'}
                    </div>
                )}
                {filteredBooks.map(book => (
                    <div key={book.id} className={styles.card} onClick={() => onSelectBook?.(book)}>
                        <div className={styles.coverContainer}>
                            {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className={styles.cover} />
                            ) : (
                                <div className={styles.placeholderCover}>{book.title[0]}</div>
                            )}
                        </div>
                        <div className={styles.info}>
                            <h4 className={styles.title}>{book.title}</h4>
                            <p className={styles.author}>{book.author || 'Unknown Author'}</p>
                        </div>
                        {onSelectBook && <div className={styles.selectOverlay}>Select</div>}
                    </div>
                ))}
            </div>
        </div>
    );
};
