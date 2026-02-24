// src/lib/crypto.ts

// --- Constants ---
const ALGORITHM_NAME = "ECDH";
const CURVE = "P-256";
const DERIVED_KEY_ALGO = "AES-GCM";
const DERIVED_KEY_LENGTH = 256;

// --- Types ---
export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

// --- Key Management ---

// 1. Generate a new Key Pair
export async function generateKeyPair(): Promise<KeyPair> {
    return window.crypto.subtle.generateKey(
        {
            name: ALGORITHM_NAME,
            namedCurve: CURVE,
        },
        false, // Private key non-extractable (for specific usage) - wait, we need nextjs export?
        // Actually, we want to store it in IndexedDB. 
        // We will make it extractable *only* for backup purposes if needed, or non-extractable and use crypto.subtle to usage.
        // Let's make it True for now to allow backup, but we will store it securely.
        ["deriveKey", "deriveBits"]
    ) as Promise<KeyPair>;
}

// 2. Export Public Key (to send to Server)
export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
}

// 3. Import Public Key (from Server)
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(jwkString);
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: ALGORITHM_NAME,
            namedCurve: CURVE,
        },
        true,
        []
    );
}

// --- Encryption / Decryption ---

// 4. Derive Shared Secret (ECDH)
async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    return window.crypto.subtle.deriveKey(
        {
            name: ALGORITHM_NAME,
            public: publicKey,
        },
        privateKey,
        {
            name: DERIVED_KEY_ALGO,
            length: DERIVED_KEY_LENGTH,
        },
        false,
        ["encrypt", "decrypt"]
    );
}

// 5. Encrypt Message
export async function encryptMessage(
    text: string,
    myPrivateKey: CryptoKey,
    recipientPublicKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
    const sharedKey = await deriveSharedKey(myPrivateKey, recipientPublicKey);
    const encodedText = new TextEncoder().encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: DERIVED_KEY_ALGO,
            iv: iv,
        },
        sharedKey,
        encodedText
    );

    return {
        ciphertext: arrayBufferToBase64(encryptedBuffer),
        iv: arrayBufferToBase64(iv.buffer),
    };
}

// 6. Decrypt Message
export async function decryptMessage(
    ciphertextBase64: string,
    ivBase64: string,
    myPrivateKey: CryptoKey,
    senderPublicKey: CryptoKey
): Promise<string> {
    const sharedKey = await deriveSharedKey(myPrivateKey, senderPublicKey);
    const encryptedData = base64ToArrayBuffer(ciphertextBase64);
    const iv = base64ToArrayBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: DERIVED_KEY_ALGO,
            iv: iv,
        },
        sharedKey,
        encryptedData
    );

    return new TextDecoder().decode(decryptedBuffer);
}

// --- Utils ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
