import React, { useState, useEffect, useRef } from 'react';
import styles from './Chat.module.css';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';

interface ChatProps {
    channelId: string; // passing roomId basically
}

export const Chat: React.FC<ChatProps> = ({ channelId }) => {
    const { user } = useAuth();
    const { messages, sendMessage } = useChat(channelId);
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user) return;

        await sendMessage(user.id, input);
        setInput('');
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className={styles.container}>
            <div className={styles.messages}>
                {messages.map((msg, index) => {
                    const isOwn = user?.id === msg.user_id;
                    const prevMsg = messages[index - 1];
                    // Clean check: safe even if prevMsg is undefined
                    const sameUser = prevMsg && prevMsg.user_id === msg.user_id;
                    // Check if time difference is significant (e.g. > 2 mins), break the group
                    const timeDiff = prevMsg ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() : 0;
                    const showName = !isOwn && (!sameUser || timeDiff > 120000);

                    return (
                        <div key={msg.id} className={isOwn ? styles.messageOwn : styles.message}
                            style={{ marginTop: sameUser && !showName ? 2 : 12 }}>

                            {!isOwn && (
                                <div className={styles.avatar} style={{ opacity: showName ? 1 : 0 }}>
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_name}`}
                                        alt={msg.sender_name}
                                        className={styles.avatarImg}
                                        width={28}
                                        height={28}
                                    />
                                </div>
                            )}

                            <div className={styles.contentWrapper}>
                                {showName && <span className={styles.senderName}>{msg.sender_name}</span>}
                                <div className={styles.bubble}>
                                    {msg.content}
                                </div>
                                <span className={styles.time}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>
            <form className={styles.inputArea} onSubmit={handleSend}>
                <input
                    className={styles.input}
                    placeholder={user ? "Type a message..." : "Sign in to chat"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={!user}
                    autoComplete="off"
                    autoCorrect="off"
                />
                <button type="submit" className={styles.sendBtn} disabled={!input.trim() || !user}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </form>
        </div>
    );
};
