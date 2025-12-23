"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar/Sidebar'; // Assuming we want navigation
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [completedBooks, setCompletedBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchCompletedBooks = async () => {
            if (!user) return;
            // JOIN user_progress with books
            // user_progress(book_id) -> books(id, title, cover_url, epub_url, etc)
            const { data, error } = await supabase
                .from('user_progress')
                .select(`
                    progress_percentage,
                    last_read_at,
                    books (
                        id,
                        title,
                        cover_url,
                        author
                    )
                `)
                .eq('user_id', user.id)
                .eq('is_completed', true)
                .order('last_read_at', { ascending: false });

            if (error) {
                console.error("Error fetching completed books:", error);
            } else {
                setCompletedBooks(data || []);
            }
            setLoading(false);
        };

        if (user) {
            fetchCompletedBooks();
        }
    }, [user]);

    if (authLoading || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading Profile...</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: '-apple-system, sans-serif' }}>
            {/* Simple Header */}
            <header style={{ padding: '20px 40px', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>Libro</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', overflow: 'hidden' }}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.username || 'user'}`} alt="avatar" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span style={{ fontWeight: 500 }}>{user?.user_metadata?.username}</span>
                </div>
            </header>

            <main style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>Profile</h1>
                <p style={{ color: '#666', marginBottom: 40 }}>Your reading journey and achievements.</p>

                <section>
                    <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>🏆</span> Completed Books
                        <span style={{ fontSize: 14, background: '#f0f0f0', padding: '4px 10px', borderRadius: 20, color: '#666' }}>{completedBooks.length}</span>
                    </h2>

                    {completedBooks.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', background: '#f9f9f9', borderRadius: 16, border: '1px dashed #ddd' }}>
                            <p style={{ fontSize: 18, color: '#888', marginBottom: 10 }}>No books completed yet.</p>
                            <p style={{ fontSize: 14, color: '#aaa', marginBottom: 20 }}>Read more than 90% of a book to mark it as completed!</p>
                            <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer' }}>Browse Library</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 24 }}>
                            {completedBooks.map((item) => {
                                const book = item.books;
                                return (
                                    <div key={item.books.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{
                                            aspectRatio: '2/3', background: '#eee', borderRadius: 8, overflow: 'hidden',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative'
                                        }}>
                                            {book.cover_url ? (
                                                <img src={`/api/proxy?url=${encodeURIComponent(book.cover_url)}`} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 24 }}>📖</div>
                                            )}
                                            <div style={{
                                                position: 'absolute', top: 8, right: 8, background: '#4CAF50', color: 'white',
                                                fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                100%
                                            </div>
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</h3>
                                            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{book.author || 'Unknown Author'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
