import { useEffect, useState } from 'react';
import { generateKeyPair, exportPublicKey, KeyPair } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const DB_NAME = 'LibroKeystore';
const STORE_NAME = 'keys';

// IndexedDB Helper
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export function useKeys() {
    const { user } = useAuth();
    const [keys, setKeys] = useState<KeyPair | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const initKeys = async () => {
            try {
                const db = await openDB();

                // 1. Try to fetch from IndexedDB
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const getRequest = store.get(user.id);

                getRequest.onsuccess = async () => {
                    if (getRequest.result) {
                        // Found in local storage
                        const existingKeys = getRequest.result;
                        setKeys(existingKeys);

                        // [FIX] Self-Healing: Always ensure public key is on Supabase
                        // This fixes the case where a user has local keys but server record is missing.
                        exportPublicKey(existingKeys.publicKey).then(async (pubKeyString) => {
                            await supabase
                                .from('public_keys')
                                .upsert({
                                    user_id: user.id,
                                    public_key: pubKeyString
                                }, { onConflict: 'user_id' });
                        });

                        setLoading(false);
                    } else {
                        // 2. Not found, generate new
                        console.log("Forging new Signet Ring (Keys)...");
                        const newKeys = await generateKeyPair();

                        // 3. Store in IndexedDB
                        const writeTx = db.transaction(STORE_NAME, 'readwrite');
                        writeTx.objectStore(STORE_NAME).put(newKeys, user.id);

                        // 4. Upload Public Key to Supabase
                        const pubKeyString = await exportPublicKey(newKeys.publicKey);

                        const { error } = await supabase
                            .from('public_keys')
                            .upsert({
                                user_id: user.id,
                                public_key: pubKeyString
                            }, { onConflict: 'user_id' });

                        if (error) {
                            console.error("Failed to publish public key. Code:", error.code, "Message:", error.message, "Details:", error.details);
                        } else {
                            console.log("Signet Ring (Keys) successfully published.");
                        }

                        setKeys(newKeys);
                        setLoading(false);
                    }
                };
            } catch (err) {
                console.error("Key management error:", err);
                setLoading(false);
            }
        };

        initKeys();
    }, [user]);

    return { keys, loading };
}
