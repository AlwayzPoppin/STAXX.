import React, { useState, useEffect } from 'react';
import LegalDocs from './LegalDocs';

const LegalDisclaimer: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDocs, setShowDocs] = useState(false);

    useEffect(() => {
        // Check if user has already acknowledged the disclaimer
        const hasAcknowledged = localStorage.getItem('staxx_legal_ack');
        if (!hasAcknowledged) {
            setIsVisible(true);
        }
    }, []);

    const handleAcknowledge = () => {
        localStorage.setItem('staxx_legal_ack', 'true');
        setIsVisible(false);
    };

    if (showDocs) {
        return <LegalDocs onClose={() => setShowDocs(false)} />;
    }

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-carbon flex items-center justify-center p-6 animate-fadeIn">
            <div className="vault-card p-12 rounded-[4rem] max-w-2xl w-full text-center gold-glow relative overflow-hidden border-gold/40">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[100px] rounded-full"></div>

                <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center text-gold border border-gold/20 mx-auto mb-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>

                <h1 className="text-3xl font-black text-white mb-6 tracking-tighter uppercase">Vault Access Protocol</h1>

                <div className="space-y-6 mb-12">
                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl text-left">
                        <h4 className="text-gold text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse"></span>
                            AI Intelligence Advisory
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            STAXX is an AI-powered financial intelligence platform. All projections, categorizations, and filings are generated via machine learning models.
                            <span className="text-white font-bold ml-1">This tool does not constitute certified tax advice.</span>
                        </p>
                    </div>

                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl text-left">
                        <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                            Algorithm Limitations
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Machine learning models may produce inaccurate data ("hallucinations"). Users are responsible for verifying all figures against actual receipts and IRS guidelines.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleAcknowledge}
                        className="w-full bg-gold text-black px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-2xl shadow-gold/20"
                    >
                        Accept & Enter Vault
                    </button>
                    <button
                        onClick={() => setShowDocs(true)}
                        className="text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Review Full Terms & Privacy Policy
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LegalDisclaimer;
