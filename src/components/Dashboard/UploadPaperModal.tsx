import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import styles from './UploadPaperModal.module.css';

interface UploadPaperModalProps {
    onClose: () => void;
    onUploadComplete: () => void;
}

// Reuse definitions or import if shared (duplicating for isolation in this step)
type CourseOption = { label: string, semesters: number, id: string };
type CourseGroup = { label: string, options: CourseOption[] };

const COURSE_GROUPS: CourseGroup[] = [
    {
        label: 'B.Tech',
        options: [
            { id: 'CSE', label: 'CSE', semesters: 8 },
            { id: 'CSE_AIML', label: 'CSE AI & ML', semesters: 8 },
            { id: 'ECE', label: 'ECE', semesters: 8 },
            { id: 'MECH', label: 'MECH', semesters: 8 },
            { id: 'CIVIL', label: 'CIVIL', semesters: 8 },
            { id: 'EEE', label: 'EEE', semesters: 8 },
            { id: 'IT', label: 'IT', semesters: 8 },
            { id: 'AI&DS', label: 'AI&DS', semesters: 8 },
        ]
    },
    {
        label: 'Degree Programs',
        options: [
            { id: 'BBA', label: 'BBA', semesters: 6 },
            { id: 'BCA', label: 'BCA', semesters: 6 },
        ]
    }
];

export const UploadPaperModal: React.FC<UploadPaperModalProps> = ({ onClose, onUploadComplete }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [branch, setBranch] = useState('CSE');
    const [semester, setSemester] = useState(1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [subjectCode, setSubjectCode] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            // Auto-fill title if empty
            if (!title) {
                setTitle(selected.name.replace('.pdf', ''));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) return;

        setLoading(true);
        try {
            // 0. Check for Duplicates
            const { data: existing } = await supabase
                .from('academic_papers')
                .select('id')
                .eq('subject_code', subjectCode.toUpperCase())
                .eq('year', year)
                .eq('branch', branch)
                .eq('semester', semester)
                .maybeSingle();

            if (existing) {
                alert(`A paper for ${subjectCode} (${year}) already exists in the archives.`);
                setLoading(false);
                return;
            }

            // 1. Upload File
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${branch}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('archive_papers')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('archive_papers')
                .getPublicUrl(filePath);

            // 3. Insert Record
            const { error: insertError } = await supabase
                .from('academic_papers')
                .insert({
                    title,
                    branch,
                    semester,
                    year,
                    subject_code: subjectCode.toUpperCase(),
                    file_url: publicUrl,
                    uploaded_by: user.id
                });

            if (insertError) throw insertError;

            // Success
            onUploadComplete();
            onClose();
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Upload Paper</h3>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>

                    <div className={styles.field}>
                        <label className={styles.label}>Paper Title</label>
                        <input
                            className={styles.input}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Engineering Mathematics I"
                            required
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className={styles.label}>Course</label>
                            <select
                                className={styles.select}
                                value={branch}
                                onChange={e => setBranch(e.target.value)}
                            >
                                {COURSE_GROUPS.map(group => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.options.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className={styles.label}>Semester</label>
                            <select
                                className={styles.select}
                                value={semester}
                                onChange={e => setSemester(Number(e.target.value))}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className={styles.label}>Year</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={year}
                                onChange={e => setYear(Number(e.target.value))}
                                required
                            />
                        </div>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className={styles.label}>Subject Code</label>
                            <input
                                className={styles.input}
                                value={subjectCode}
                                onChange={e => setSubjectCode(e.target.value)}
                                placeholder="e.g. MAT101"
                            />
                        </div>
                    </div>

                    <div className={styles.fileInputContainer}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {file ? `Selected: ${file.name}` : 'Click to select PDF'}
                        </div>
                        <input
                            type="file"
                            accept="application/pdf"
                            className={styles.fileInput}
                            onChange={handleFileChange}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading || !file}>
                        {loading ? 'Uploading...' : 'Upload to Archives'}
                    </button>
                </form>
            </div>
        </div>
    );
};
