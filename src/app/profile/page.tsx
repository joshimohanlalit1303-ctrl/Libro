"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/Footer';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [completedBooks, setCompletedBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [streak, setStreak] = useState(0);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user) return;
            const { data } = await supabase.from('profiles').select('streak_count').eq('id', user.id).single();
            if (data) setStreak(data.streak_count || 0);
        };
        if (user) fetchProfileData();
    }, [user]);

    useEffect(() => {
        const fetchCompletedBooks = async () => {
            if (!user) return;
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
        <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: '-apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
            {/* Simple Header */}
            <header style={{ padding: '20px 40px', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#666' }}>
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>Libro</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Streak Badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: '#FFF0E6', color: '#FF4500',
                        padding: '4px 10px', borderRadius: 20,
                        fontSize: 13, fontWeight: 700
                    }}>
                        <span>🔥</span> {streak} Day Streak
                    </div>

                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', overflow: 'hidden' }}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.username || 'user'}`} alt="avatar" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <span style={{ fontWeight: 500 }}>{user?.user_metadata?.username}</span>
                </div>
            </header>

            <main style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px', width: '100%', flex: 1 }}>
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

                <section style={{ marginTop: 60 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>🏠</span> Created Rooms
                    </h2>

                    <CreatedRoomsList userId={user?.id} />
                </section>
            </main>
            <Footer />
        </div>
    );
}

function CreatedRoomsList({ userId }: { userId: string | undefined }) {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;
        const fetchRooms = async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('owner_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching rooms:", error);
            } else {
                setRooms(data || []);
            }
            setLoading(false);
        };
        fetchRooms();
    }, [userId]);

    if (loading) return <div>Loading rooms...</div>;

    if (rooms.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center', background: '#f9f9f9', borderRadius: 16, border: '1px dashed #ddd' }}>
                <p style={{ fontSize: 16, color: '#888' }}>You haven't created any rooms yet.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {rooms.map((room) => (
                <div key={room.id}
                    onClick={() => router.push(`/room/${room.id}`)}
                    style={{
                        border: '1px solid #eee',
                        borderRadius: 12,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        background: '#fff'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <div style={{ height: 140, background: '#f5f5f5', position: 'relative', overflow: 'hidden' }}>
                        {room.cover_url ? (
                            <img src={room.cover_url} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📚</div>
                        )}
                        <div style={{
                            position: 'absolute', top: 10, right: 10,
                            background: 'rgba(0,0,0,0.6)', color: 'white',
                            padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600
                        }}>
                            {room.privacy === 'private' ? 'PRIVATE' : 'PUBLIC'}
                        </div>
                    </div>
                    <div style={{ padding: 16 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</h3>
                        <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 32 }}>
                            {room.description || 'No description'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#999' }}>
                            <span>Code: <span style={{ fontFamily: 'monospace', color: '#333', background: '#eee', padding: '2px 6px', borderRadius: 4 }}>{room.access_code}</span></span>
                            <span>{new Date(room.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
