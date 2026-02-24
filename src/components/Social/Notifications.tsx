import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Request {
    id: string; // Friendship ID
    requester: {
        id: string;
        username: string;
        avatar_url: string;
    };
    created_at: string;
}

export default function Notifications() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<Request[]>([]);
    const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchRequests();
        fetchUnread();

        const channel = supabase.channel('notifs-page')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` }, () => {
                fetchRequests();
            })
            // Listen for new messages
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
                fetchUnread();
            })
            // Listen for read status changes (if viewed elsewhere)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
                fetchUnread();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const fetchRequests = async () => {
        setLoading(true);
        const { data: friendships } = await supabase
            .from('friendships')
            .select('id, created_at, requester_id')
            .eq('addressee_id', user?.id)
            .eq('status', 'pending');

        if (friendships && friendships.length > 0) {
            const requesterIds = friendships.map(f => f.requester_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', requesterIds);

            if (profiles) {
                const mapped = friendships.map(f => {
                    const profile = profiles.find(p => p.id === f.requester_id);
                    return {
                        id: f.id,
                        requester: profile || { id: f.requester_id, username: 'Unknown', avatar_url: '' },
                        created_at: f.created_at,
                        type: 'request'
                    };
                });
                setRequests(mapped as Request[]);
            }
        } else {
            setRequests([]);
        }
        setLoading(false);
    };

    const fetchUnread = async () => {
        // Count unread by sender
        const { data: messages } = await supabase
            .from('messages')
            .select('id, sender_id, created_at')
            .eq('receiver_id', user?.id)
            .eq('is_read', false); // Only unread

        if (messages && messages.length > 0) {
            // Group by sender
            const senders = [...new Set(messages.map(m => m.sender_id))];

            // Fetch sender profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', senders);

            const grouped = senders.map(senderId => {
                const count = messages.filter(m => m.sender_id === senderId).length;
                const profile = profiles?.find(p => p.id === senderId);
                const latest = messages.filter(m => m.sender_id === senderId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                return {
                    id: `msg-${senderId}`,
                    sender: profile || { id: senderId, username: 'Unknown', avatar_url: '' },
                    count,
                    last_at: latest.created_at,
                    type: 'message'
                };
            });
            setUnreadMessages(grouped);
        } else {
            setUnreadMessages([]);
        }
    };

    const handleAccept = async (id: string, requesterName: string) => {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', id);

        if (!error) {
            setRequests(prev => prev.filter(r => r.id !== id));
            // Optional: Show success toast
            alert(`You have broken the seal. You may now correspond with ${requesterName}.`);
        }
    };

    const handleReject = async (id: string) => {
        const { error } = await supabase.from('friendships').delete().eq('id', id);
        if (!error) {
            setRequests(prev => prev.filter(r => r.id !== id));
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sorting the mail...</div>;

    const totalNotifications = requests.length + unreadMessages.length;

    return (
        <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', marginBottom: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                Pending Correspondence {totalNotifications > 0 && <span style={{ fontSize: 14, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 10, verticalAlign: 'middle' }}>{totalNotifications}</span>}
            </h2>

            {totalNotifications === 0 ? (
                <div style={{
                    marginTop: 60,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    opacity: 0.6
                }}>
                    <span style={{ fontSize: 40, marginBottom: 10 }}>📭</span>
                    <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>No sealed letters await you.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>

                    {/* Unread Messages */}
                    {unreadMessages.map(msg => (
                        <div key={msg.id} style={{
                            background: '#fffcdb', // Creamy highlight
                            border: '1px solid #d4c4a8',
                            padding: 20,
                            borderRadius: 2,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                background: 'repeating-linear-gradient(45deg, #27ae60, #27ae60 10px, #ecf0f1 10px, #ecf0f1 20px)'
                            }} />

                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, marginBottom: 16 }}>
                                <img
                                    src={msg.sender.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender.username}`}
                                    style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #f0f0f0', marginRight: 15 }}
                                />
                                <div>
                                    <div style={{ fontSize: 13, color: '#27ae60', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NEW MESSAGE</div>
                                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600 }}>{msg.sender.username}</div>
                                </div>
                            </div>

                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, fontStyle: 'italic', lineHeight: '1.4' }}>
                                "You have {msg.count} unread sealed letter{msg.count > 1 ? 's' : ''} waiting."
                            </p>

                            <button
                                // We can't navigate tabs easily without context, but typically users will click "Sealed Letters" tab manually.
                                // For now, simple Alert or disabled button since navigation requires lifting state.
                                // Ideal: Pass `onSwitchToChat` prop.
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 4,
                                    cursor: 'default',
                                    fontFamily: 'var(--font-serif)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                }}
                            >
                                <span>✉️</span> Go to Sealed Letters
                            </button>
                        </div>
                    ))}

                    {/* Friend Requests */}
                    {requests.map(req => (
                        <div key={req.id} style={{
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            padding: 20,
                            borderRadius: 2,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Envelope Aesthetics */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                background: 'repeating-linear-gradient(45deg, #c0392b, #c0392b 10px, #ecf0f1 10px, #ecf0f1 20px, #2980b9 20px, #2980b9 30px, #ecf0f1 30px, #ecf0f1 40px)'
                            }} />

                            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, marginBottom: 16 }}>
                                <img
                                    src={req.requester.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.requester.username}`}
                                    style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid #f0f0f0', marginRight: 15 }}
                                />
                                <div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FRIEND REQUEST</div>
                                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600 }}>{req.requester.username}</div>
                                </div>
                            </div>

                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, fontStyle: 'italic', lineHeight: '1.4' }}>
                                "{req.requester.username} requests to exchange sealed letters."
                            </p>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => handleAccept(req.id, req.requester.username)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: '#8e44ad', // Royal Purple
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-serif)',
                                        fontWeight: 500,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}
                                >
                                    <span>💌</span> Break Seal
                                </button>
                                <button
                                    onClick={() => handleReject(req.id)}
                                    style={{
                                        padding: '10px 15px',
                                        background: 'transparent',
                                        border: '1px solid #ccc',
                                        color: '#666',
                                        borderRadius: 4,
                                        cursor: 'pointer'
                                    }}
                                    title="Burn Letter"
                                >
                                    🔥
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
