import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useKeys } from '@/hooks/useKeys';
import { encryptMessage, decryptMessage, importPublicKey } from '@/lib/crypto';
import styles from './Social.module.css';

interface Friend {
    friendship_id: string;
    friend_id: string;
    username: string;
    avatar_url: string;
    public_key?: string; // Cache this
    unreadCount?: number; // [NEW] Badge
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id?: string;
    content: string;
    sent_at: string;
    is_read?: boolean;
    iv?: string;
    is_encrypted?: boolean;
    isError?: boolean;
}

export default function Correspondence() {
    const { user } = useAuth();
    const { keys, loading: keysLoading } = useKeys();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Friends & Unread Counts
    useEffect(() => {
        if (!user) return;
        const fetchFriends = async () => {
            const { data: friendships } = await supabase
                .from('friendships')
                .select('*')
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (!friendships || friendships.length === 0) {
                setFriends([]);
                return;
            };

            const friendIds = friendships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);

            // Parallel Fetch: Profiles, Keys, Unread Counts
            const [profilesRes, keysRes, unreadRes] = await Promise.all([
                supabase.from('profiles').select('id, username, avatar_url').in('id', friendIds),
                supabase.from('public_keys').select('user_id, public_key').in('user_id', friendIds),
                supabase.rpc('get_unread_counts', { user_id: user.id }) // Optimization: we'd usually use a view or RPC.
            ]);

            // Fallback: Fetch unread counts manually if RPC doesn't exist (it doesn't yet). 
            // We will do a raw select count group by sender.
            // Supabase JS doesn't support easy "Select count group by". 
            // We will just fetch all unread messages for me.
            const { data: unreadMessages } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            const profiles = profilesRes.data || [];
            const keysData = keysRes.data || [];
            const unreadGroups = (unreadMessages || []).reduce((acc: { [key: string]: number }, msg) => {
                acc[msg.sender_id] = (acc[msg.sender_id] || 0) + 1;
                return acc;
            }, {});

            const mapped = profiles.map(p => {
                const fs = friendships.find(f => (f.requester_id === p.id || f.addressee_id === p.id));
                const pk = keysData.find(k => k.user_id === p.id);
                return {
                    friendship_id: fs?.id || '',
                    friend_id: p.id,
                    username: p.username,
                    avatar_url: p.avatar_url,
                    public_key: pk?.public_key,
                    unreadCount: unreadGroups[p.id] || 0
                };
            });
            setFriends(mapped);
        };

        fetchFriends();

        // Global Subscription for Badge Updates
        const channel = supabase.channel('global_inbox')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
                // Determine sender
                const senderId = payload.new.sender_id;
                setFriends(prev => prev.map(f => {
                    if (f.friend_id === senderId) {
                        // If this friend is NOT selected, increment.
                        // If selected, we handle read-marking elsewhere, but let's increment and let the read-logic clear it to be safe?
                        // Actually read-logic fires on fetch.
                        return { ...f, unreadCount: (f.unreadCount || 0) + 1 };
                    }
                    return f;
                }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // Clear Badge when selecting friend
    useEffect(() => {
        if (selectedFriend) {
            setFriends(prev => prev.map(f => f.friend_id === selectedFriend.friend_id ? { ...f, unreadCount: 0 } : f));
        }
    }, [selectedFriend]);

    // 2. Fetch & Decrypt Messages (keep existing logic mostly, but refined)
    useEffect(() => {
        if (!selectedFriend || !user || !keys) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*, sent_at:created_at')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .or(`sender_id.eq.${selectedFriend.friend_id},receiver_id.eq.${selectedFriend.friend_id}`)
                .order('created_at', { ascending: true });

            if (data) {
                // [READ RECEIPTS] Mark as read IMMEDIATELY
                const unreadIds = data
                    .filter(m => m.receiver_id === user.id && m.is_read === false)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    // Optimistic clear badge (already done by effect above)
                    supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then();
                }

                const decrypted = await Promise.all(data.map(async (msg) => {
                    // ... decryption logic unchanged ...
                    if (msg.sender_id === user.id) {
                        // ... logic unchanged ...
                    }
                    try {
                        let targetPubKeyString = selectedFriend.public_key;
                        if (!targetPubKeyString) return { ...msg, content: '🔒 [Key Missing]', is_encrypted: true };

                        const targetPubKey = await importPublicKey(targetPubKeyString);
                        const plain = await decryptMessage(msg.content, msg.iv, keys.privateKey, targetPubKey);
                        return { ...msg, content: plain, is_encrypted: false };
                    } catch (e) {
                        return { ...msg, content: 'BROKEN_SEAL', is_encrypted: true, is_error: true };
                    }
                }));
                setMessages(decrypted);
            }
        };

        fetchMessages();

        const channel = supabase.channel(`chat:${selectedFriend.friend_id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const msg = payload.new;
                const isRelevant = (msg.sender_id === user.id && msg.receiver_id === selectedFriend.friend_id) ||
                    (msg.sender_id === selectedFriend.friend_id && msg.receiver_id === user.id);
                if (isRelevant) {
                    fetchMessages();
                    // If it's incoming from them, mark read
                    if (msg.sender_id === selectedFriend.friend_id) {
                        supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then();
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [selectedFriend, user, keys]);

    // 3. Send Message
    const handleSend = async () => {
        if (!inputText.trim() || !selectedFriend || !user || !keys) return;

        // [OPTIMISTIC UPDATE] Show message immediately
        const optimisticId = 'temp-' + Date.now();
        const optimisticMsg: Message = {
            id: optimisticId,
            sender_id: user.id,
            content: inputText,
            sent_at: new Date().toISOString(),
            is_encrypted: false // It's plaintext to us localy
        };

        // Add to state immediately
        setMessages(prev => [...prev, optimisticMsg]);
        const textToSend = inputText;
        setInputText(''); // Clear input immediately
        setSending(true);

        try {
            // [FIX] Dynamic Refetch of Keys
            let targetPubKeyString = selectedFriend.public_key;

            if (!targetPubKeyString) {
                console.log("Key missing in cache, refetching...");
                const { data: keyData } = await supabase
                    .from('public_keys')
                    .select('public_key')
                    .eq('user_id', selectedFriend.friend_id)
                    .single();

                if (keyData?.public_key) {
                    targetPubKeyString = keyData.public_key;
                    // Update local state to avoid future refetches
                    setFriends(prev => prev.map(f =>
                        f.friend_id === selectedFriend.friend_id
                            ? { ...f, public_key: keyData.public_key }
                            : f
                    ));
                    // Also update selectedFriend ref just in case
                    selectedFriend.public_key = keyData.public_key;
                }
            }

            if (!targetPubKeyString) {
                // Revert optimistic if failed
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                alert("Recipient off-grid (No Keys). Click 'Check' to retry...");
                setSending(false);
                return;
            }

            const friendPubKey = await importPublicKey(targetPubKeyString);
            const { ciphertext, iv } = await encryptMessage(textToSend, keys.privateKey, friendPubKey);

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: user.id,
                    receiver_id: selectedFriend.friend_id,
                    content: ciphertext,
                    iv: iv
                });

            if (error) throw error;
            // Refetch will handle replacing the optimistic msg with the real one
        } catch (e) {
            console.error("Failed to send:", e);
            // Revert optimistic on error
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            alert("The wax seal broke. Message failure. (Check internet)");
        } finally {
            setSending(false);
        }
    };

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);



    // Mobile Responsive Logic
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (keysLoading) return <div>Forging Keys...</div>;
    if (!keys) return <div>Error: No keys found.</div>;

    const showSidebar = !isMobile || (isMobile && !selectedFriend);
    const showChat = !isMobile || (isMobile && selectedFriend);

    return (
        <div style={{ display: 'flex', height: '80vh', border: '1px solid var(--border-subtle)', background: 'var(--card-bg)' }}>

            {/* Sidebar List */}
            <div style={{
                width: isMobile ? '100%' : 250,
                borderRight: isMobile ? 'none' : '1px solid var(--border-subtle)',
                padding: 10,
                overflowY: 'auto',
                display: showSidebar ? 'block' : 'none'
            }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 10 }}>Correspondents</h3>
                {friends.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No kindred spirits yet. Search the directory.</div>}
                {friends.map(f => (
                    <div
                        key={f.friendship_id}
                        onClick={() => setSelectedFriend(f)}
                        style={{
                            padding: 15, // Larger tap target
                            cursor: 'pointer',
                            background: selectedFriend?.friend_id === f.friend_id ? 'var(--input-bg)' : 'transparent',
                            borderRadius: 4,
                            marginBottom: 4,
                            display: 'flex', alignItems: 'center', gap: 10,
                            borderBottom: '1px solid var(--border-subtle)'
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <img
                                src={f.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`}
                                onError={(e) => {
                                    e.currentTarget.onerror = null; // Prevent infinite loop
                                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`;
                                }}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#eee' }}
                            />
                            {f.unreadCount && f.unreadCount > 0 ? (
                                <div style={{
                                    position: 'absolute',
                                    top: -2, right: -2,
                                    background: 'red', color: 'white',
                                    fontSize: 10, fontWeight: 'bold',
                                    width: 18, height: 18,
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid var(--card-bg)'
                                }}>
                                    {f.unreadCount}
                                </div>
                            ) : null}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: 16 }}>{f.username}</span>
                    </div>
                ))}
            </div>

            {/* Chat Area */}
            <div style={{
                flex: 1,
                display: showChat ? 'flex' : 'none',
                flexDirection: 'column',
                width: isMobile ? '100%' : 'auto'
            }}>
                {selectedFriend ? (
                    <>
                        {/* Header */}
                        <div style={{
                            padding: 15,
                            borderBottom: '1px solid var(--border-subtle)',
                            background: 'var(--surface)',
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            {isMobile && (
                                <button
                                    onClick={() => setSelectedFriend(null)}
                                    style={{
                                        background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', paddingRight: 10
                                    }}
                                >
                                    ←
                                </button>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>
                                    <b>{selectedFriend.username}</b>
                                </span>
                                {!selectedFriend.public_key && <span style={{ color: 'red', fontSize: 12 }}>(No Secure Connection)</span>}
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: 'var(--background)' }}>
                            {messages.reduce((acc: any[], msg) => {
                                const last = acc[acc.length - 1];
                                const isError = msg.content === 'BROKEN_SEAL' || msg.content === '🔒 [Key Missing]' || msg.content.includes('[Sealed - Decryption Failed]');

                                if (isError && last?.isError) {
                                    last.count++;
                                    return acc;
                                }
                                acc.push({ ...msg, isError, count: 1 });
                                return acc;
                            }, []).map((msg: any) => {
                                if (msg.isError) {
                                    return (
                                        <div key={msg.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '16px 0', opacity: 0.6
                                        }}>
                                            <div style={{
                                                fontSize: 12, fontStyle: 'italic',
                                                background: '#f0e6d2', padding: '4px 12px', borderRadius: 12,
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}>
                                                <span>🔒</span>
                                                {msg.count > 1
                                                    ? `${msg.count} unreadable messages (Old Keys)`
                                                    : "Unreadable message (Key Mismatch)"}
                                            </div>
                                        </div>
                                    );
                                }

                                const isMe = msg.sender_id === user?.id;
                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex',
                                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                                        marginBottom: 16
                                    }}>
                                        <div style={{
                                            maxWidth: '85%', // More width on mobile
                                            padding: '12px 18px',
                                            borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                            background: isMe ? 'var(--primary)' : 'var(--input-bg)',
                                            color: isMe ? '#fff' : 'var(--foreground)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        }}>
                                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, whiteSpace: 'pre-wrap' }}>
                                                {msg.content}
                                            </div>
                                            <div style={{
                                                fontSize: 10,
                                                opacity: 0.7,
                                                marginTop: 6,
                                                textAlign: 'right',
                                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4
                                            }}>
                                                {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                {msg.is_encrypted && ' 🔒'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ padding: 15, borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)', display: 'flex', gap: 10 }}>
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !sending && selectedFriend.public_key && handleSend()}
                                placeholder={!selectedFriend.public_key ? "No Keys..." : isMobile ? "Message..." : "Dip your quill..."}
                                disabled={!selectedFriend.public_key}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: 20,
                                    border: '1px solid var(--border-subtle)',
                                    background: !selectedFriend.public_key ? '#f9f9f9' : 'var(--input-bg)',
                                    color: 'var(--foreground)',
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: 16, // Prevent zoom on mobile
                                    cursor: !selectedFriend.public_key ? 'not-allowed' : 'text'
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={sending || (!selectedFriend.public_key ? false : !inputText.trim())}
                                style={{
                                    padding: '0 16px',
                                    background: sending ? 'var(--text-muted)' : (selectedFriend.public_key ? 'var(--primary)' : '#f39c12'),
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 99,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-serif)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    justifyContent: 'center'
                                }}
                            >
                                {sending ? '...' : (selectedFriend.public_key ? '➤' : '🔄')}
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
                        Select a correspondent from the list to begin.
                    </div>
                )}
            </div>
        </div>
    );
}
