import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './ArchivesModal.module.css';
import { UploadPaperModal } from './UploadPaperModal'; // [NEW]

interface ArchivesModalProps {
    onClose: () => void;
}

interface Paper {
    id: string;
    title: string;
    branch: string;
    year: number;
    semester: number;
    subject_code: string;
    file_url: string;
    created_at: string;
}

// Course Definitions
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

// Helper to flatten for lookup
const FLATTENED_COURSES = COURSE_GROUPS.reduce((acc, group) => {
    group.options.forEach(opt => {
        acc[opt.id] = opt;
    });
    return acc;
}, {} as Record<string, CourseOption>);

export const ArchivesModal: React.FC<ArchivesModalProps> = ({ onClose }) => {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false); // [NEW]

    // Filters
    const [branch, setBranch] = useState<string>('CSE');
    const [semester, setSemester] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState('');

    // Dynamic Semesters based on Branch/Course
    const availableSemesters = useMemo(() => {
        const count = FLATTENED_COURSES[branch]?.semesters || 8;
        return Array.from({ length: count }, (_, i) => i + 1);
    }, [branch]);

    // Reset semester if it exceeds current course's max
    useEffect(() => {
        const max = FLATTENED_COURSES[branch]?.semesters || 8;
        if (semester > max) {
            setSemester(1);
        }
    }, [branch]);

    useEffect(() => {
        fetchPapers();
    }, [branch, semester]);

    const fetchPapers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('academic_papers')
                .select('*')
                .eq('branch', branch)
                .eq('semester', semester)
                .order('year', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setPapers(data || []);
        } catch (err: any) {
            console.error('Error fetching papers:', err.message || err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPapers = papers.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subject_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>The Archives</h2>
                        <p className={styles.subtitle}>Curated collection of previous year question papers</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Upload Button - Hidden by default, uncomment to enable admin upload */}
                        {/* 
                        <button 
                            onClick={() => setShowUpload(true)}
                            title="Upload Paper"
                            style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                            +
                        </button> 
                        */}
                        <button className={styles.closeButton} onClick={onClose}>&times;</button>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    <select
                        className={styles.select}
                        value={branch}
                        onChange={e => setBranch(e.target.value)}
                    >
                        {COURSE_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label}>
                                {group.options.map(opt => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>

                    <select
                        className={styles.select}
                        value={semester}
                        onChange={e => setSemester(Number(e.target.value))}
                    >
                        {availableSemesters.map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Search subject or code..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div>Searching the stacks...</div>
                        </div>
                    ) : filteredPapers.length === 0 ? (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>🕸️</div>
                            <h3 className={styles.emptyTitle}>Nothing here yet</h3>
                            <p className={styles.emptyDesc}>
                                No records found for {branch} Semester {semester}.<br />
                                The archives are silent.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredPapers.map(paper => (
                                <a
                                    key={paper.id}
                                    href={paper.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.card}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.badge}>{paper.subject_code}</div>
                                        <div className={styles.cardMeta}>{paper.year}</div>
                                    </div>
                                    <div className={styles.cardTitle}>
                                        {paper.title}
                                    </div>
                                    <div className={styles.cardMeta}>
                                        Official Paper • PDF
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legal Footer */}
                <div className={styles.footer}>
                    Disclaimer: Papers are stored for educational reference only.
                    Copyright belongs to the respective examining body.
                    <br />
                    Please verify with your institution's specific policies before redistribution.
                </div>
            </div>

            {showUpload && (
                <UploadPaperModal
                    onClose={() => setShowUpload(false)}
                    onUploadComplete={() => {
                        fetchPapers(); // Refresh the list
                    }}
                />
            )}
        </div>
    );
};
