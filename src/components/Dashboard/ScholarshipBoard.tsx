import React from 'react';
import styles from './Dashboard.module.css'; // Re-use dashboard styles for consistency

const OPPORTUNITIES = [
    {
        name: "National Scholarship Portal",
        desc: "Govt of India's central portal for student scholarships.",
        url: "https://scholarships.gov.in/",
        tag: "GOVT"
    },
    {
        name: "Buddy4Study",
        desc: "India's largest scholarship platform connecting students with unparalleled opportunities.",
        url: "https://www.buddy4study.com/",
        tag: "AGGREGATOR"
    },
    {
        name: "Scholars4Dev",
        desc: "International scholarships for students from developing countries.",
        url: "https://www.scholars4dev.com/",
        tag: "GLOBAL"
    },
    {
        name: "WeMakeScholars",
        desc: "Study abroad education loan and scholarship support.",
        url: "https://www.wemakescholars.com/",
        tag: "LOANS"
    }
];

export const ScholarshipBoard = () => {
    return (
        <div className={styles.sidebarCard} style={{
            marginBottom: '32px',
            borderColor: '#DAA520',
            borderWidth: '1px',
            borderStyle: 'solid',
            backgroundColor: '#FFFBF0' // Warmer banner bg
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B8860B', margin: 0, fontWeight: 700 }}>
                    🎓 Opportunity Board
                </h4>
                <span style={{ fontSize: '10px', background: '#FFF8DC', color: '#B8860B', padding: '2px 8px', borderRadius: '4px', border: '1px solid #F0E68C' }}>SDG Target 4.b</span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
            }}>
                {OPPORTUNITIES.map((opp, i) => (
                    <a
                        key={i}
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'block',
                            padding: '12px',
                            borderRadius: '6px',
                            background: '#fff',
                            border: '1px solid rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>{opp.name}</span>
                            <span style={{ fontSize: '8px', fontWeight: 700, color: '#888', background: '#f5f5f7', padding: '2px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>{opp.tag}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', lineHeight: '1.4', margin: 0 }}>
                            {opp.desc}
                        </p>
                    </a>
                ))}
            </div>
        </div>
    );
};
