import React from 'react';

interface SummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: string;
    isLoading: boolean;
    isSimulated?: boolean;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, summary, isLoading, isSimulated }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 20000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: '#fff',
                width: '90%', maxWidth: '400px',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                position: 'relative',
                animation: 'scaleIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>

                <style>{`
                    @keyframes scaleIn {
                        from { transform: scale(0.9); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                        <span>✨</span> Chapter Insight
                    </h3>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none',
                        fontSize: '20px', cursor: 'pointer', color: '#888'
                    }}>×</button>
                </div>

                {isLoading ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: '#666' }}>
                        <div style={{
                            width: '24px', height: '24px',
                            border: '3px solid #eee', borderTopColor: '#007AFF', borderRadius: '50%',
                            margin: '0 auto 16px', animation: 'spin 1s linear infinite'
                        }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        <p style={{ margin: 0, fontSize: '14px' }}>Reading the chapter...</p>
                    </div>
                ) : (
                    <div style={{
                        maxHeight: '60vh', overflowY: 'auto',
                        lineHeight: '1.6', fontSize: '15px', color: '#333'
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                )}
            </div>
        </div>
    );
};
