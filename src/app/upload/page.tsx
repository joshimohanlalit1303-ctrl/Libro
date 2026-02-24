'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Dynamic import handled inside function


type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface BookMetadata {
    file: File;
    title: string;
    author: string;
    coverUrl: string | null;
    coverBlob: Blob | null;
    status: UploadStatus;
    message?: string;
}

export default function UploadPage() {
    const [books, setBooks] = useState<BookMetadata[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsProcessing(true);
        const newBooks: BookMetadata[] = [];
        const files = Array.from(e.target.files);

        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.epub')) continue;

            try {
                // Determine ePub class from dynamic import
                // @ts-ignore
                const ePubModule = await import('epubjs');
                // Handle both default and named export variations just in case
                // @ts-ignore
                const ePub = ePubModule.default || ePubModule;

                const book = ePub(await file.arrayBuffer());
                const metadata = await book.loaded.metadata;
                const coverUrl = await book.coverUrl();

                // EPubJS returns a blob URL for the cover, but we need the actual blob to upload
                let coverBlob = null;
                if (coverUrl) {
                    const resp = await fetch(coverUrl);
                    coverBlob = await resp.blob();
                }

                newBooks.push({
                    file,
                    title: metadata.title || file.name.replace('.epub', ''),
                    author: metadata.creator || 'Unknown Author',
                    coverUrl: coverUrl || null,
                    coverBlob: coverBlob,
                    status: 'idle',
                });
            } catch (err) {
                console.error(`Error parsing ${file.name}:`, err);
                // Fallback to filename
                newBooks.push({
                    file,
                    title: file.name.replace('.epub', ''),
                    author: 'Unknown Author',
                    coverUrl: null,
                    coverBlob: null,
                    status: 'idle',
                    message: 'Metadata extraction failed',
                });
            }
        }

        setBooks((prev) => [...prev, ...newBooks]);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadBook = async (index: number) => {
        const book = books[index];
        if (book.status === 'success' || book.status === 'uploading') return;

        setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'uploading' } : b));

        try {
            // 0. Check for duplicates
            const { data: existingBooks } = await supabase
                .from('books')
                .select('id')
                .ilike('title', book.title)
                .ilike('author', book.author);

            if (existingBooks && existingBooks.length > 0) {
                setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'error', message: 'Duplicate: Book already exists' } : b));
                return;
            }

            // 1. Upload Epub
            const epubPath = `public/${Date.now()}_${book.file.name.replace(/[^a-z0-9.]/gi, '_')}`;
            const { data: epubData, error: epubError } = await supabase.storage
                .from('books')
                .upload(epubPath, book.file);

            if (epubError) throw epubError;

            const { data: { publicUrl: epubPublicUrl } } = supabase.storage
                .from('books')
                .getPublicUrl(epubPath);

            // 2. Upload Cover (if exists)
            let coverPublicUrl = null;
            if (book.coverBlob) {
                const coverPath = `covers/${Date.now()}_${book.title.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                const { error: coverError } = await supabase.storage
                    .from('books')
                    .upload(coverPath, book.coverBlob);

                if (!coverError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('books')
                        .getPublicUrl(coverPath);
                    coverPublicUrl = publicUrl;
                }
            }

            // 3. Insert into DB
            const { error: dbError } = await supabase
                .from('books')
                .insert({
                    title: book.title,
                    author: book.author,
                    epub_url: epubPublicUrl,
                    cover_url: coverPublicUrl,
                    // uploaded_by: (await supabase.auth.getUser()).data.user?.id // Optional: let RLS handle it or trigger automatically
                });

            if (dbError) throw dbError;

            setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'success' } : b));

        } catch (error: any) {
            console.error("Upload error:", error);
            setBooks(prev => prev.map((b, i) => i === index ? { ...b, status: 'error', message: error.message } : b));
        }
    };

    const uploadAll = async () => {
        // sequential to avoid rate limits? or parallel? parallel is fine for small batches
        books.forEach((_, i) => uploadBook(i));
    };

    const removeBook = (index: number) => {
        setBooks(prev => prev.filter((_, i) => i !== index));
    };

    const updateMetadata = (index: number, field: 'title' | 'author', value: string) => {
        setBooks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                Bulk Library Upload
            </h1>

            <div className="mb-8 p-6 bg-gray-900 rounded-xl border border-gray-800">
                <input
                    type="file"
                    multiple
                    accept=".epub"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                />
                <label
                    htmlFor="file-upload"
                    className={`cursor-pointer inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${isProcessing
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {isProcessing ? 'Processing files...' : 'Select Epubs'}
                </label>
                <span className="ml-4 text-gray-400 text-sm">
                    Supported: .epub
                </span>
            </div>

            {books.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Queue ({books.length})</h2>
                        <button
                            onClick={uploadAll}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Upload All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {books.map((book, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
                                <div className="w-20 h-28 bg-gray-800 rounded overflow-hidden flex-shrink-0 relative">
                                    {book.coverUrl ? (
                                        <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs text-center p-1">
                                            No Cover
                                        </div>
                                    )}
                                </div>

                                <div className="flex-grow space-y-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Title</label>
                                            <input
                                                value={book.title}
                                                onChange={(e) => updateMetadata(idx, 'title', e.target.value)}
                                                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 focus:border-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Author</label>
                                            <input
                                                value={book.author}
                                                onChange={(e) => updateMetadata(idx, 'author', e.target.value)}
                                                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 focus:border-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        File: {book.file.name} ({(book.file.size / 1024 / 1024).toFixed(2)} MB)
                                    </div>
                                    {book.message && (
                                        <div className="text-xs text-yellow-500">
                                            Note: {book.message}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2 w-32 flex-shrink-0">
                                    {book.status === 'idle' && (
                                        <button
                                            onClick={() => removeBook(idx)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    {book.status === 'uploading' && (
                                        <span className="text-blue-400 text-sm animate-pulse">Uploading...</span>
                                    )}
                                    {book.status === 'success' && (
                                        <span className="text-green-400 text-sm font-medium">Done</span>
                                    )}
                                    {book.status === 'error' && (
                                        <span className="text-red-400 text-sm font-medium">Error</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
