import React, { useState } from 'react';

type Tab = 'TOS' | 'PRIVACY';

interface LegalDocsProps {
    initialTab?: Tab;
    onClose: () => void;
}

const LegalDocs: React.FC<LegalDocsProps> = ({ initialTab = 'TOS', onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);

    return (
        <div className="fixed inset-0 z-[1200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-4xl bg-black border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('TOS')}
                            className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeTab === 'TOS' ? 'bg-gold text-black' : 'text-slate-500 hover:text-white'}`}
                        >
                            Terms of Service
                        </button>
                        <button
                            onClick={() => setActiveTab('PRIVACY')}
                            className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeTab === 'PRIVACY' ? 'bg-gold text-black' : 'text-slate-500 hover:text-white'}`}
                        >
                            Privacy Policy
                        </button>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed text-slate-300">
                    {activeTab === 'TOS' ? (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-black text-white">Terms of Service</h1>
                            <p className="text-xs text-slate-500">Last Updated: January 2026</p>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">1. PLATFORM MISSION & SCOPE</h2>
                                <p>STAXX provides a proprietary financial vault and AI-driven tax intelligence platform. By accessing the service, you acknowledge that STAXX is a productivity tool and not a financial institution, law firm, or certified public accounting (CPA) office.</p>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">2. AI ADVISORY DISCLAIMER</h2>
                                <p className="p-4 bg-gold/5 border border-gold/10 rounded-xl text-gold">
                                    <strong>CRITICAL:</strong> All tax projections, expense categorizations, and filing strategies are generated via Large Language Models (LLMs). These outputs are heuristic estimates and may contain errors. Users are MANDATED to verify all AI-generated data with a qualified tax professional before submission to any regulatory body.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">3. USER RESPONSIBILITIES</h2>
                                <p>You are solely responsible for the accuracy of data uploaded to the vault. STAXX does not audit your transactions for veracity. Fraudulent or inaccurate reporting is the sole liability of the user.</p>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">4. LIMITATION OF LIABILITY</h2>
                                <p>STAXX, its developers, and partners shall not be held liable for IRS audits, penalties, or missed deductions resulting from the use of this platform. The maximum liability of the platform is limited to the fees paid for the service.</p>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-black text-white">Privacy Policy</h1>
                            <p className="text-xs text-slate-500">Last Updated: January 2026</p>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">1. DATA MINIMIZATION</h2>
                                <p>Our "Shield-Before-Storage" protocol ensures that sensitive Personally Identifiable Information (PII) is redacted using local heuristic layers before it reaches our AI processing partners. We only store the minimum data required to facilitate your tax journey.</p>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">2. PROCESSING PARTNERS</h2>
                                <p>Financial data is processed via Google Gemini API. We utilize restricted data processing (RDP) modes where available to ensure that your financial snapshots are not used for global model training.</p>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">3. ENCRYPTION & VAULTING</h2>
                                <p>All transaction logs are encrypted at rest. We do not sell user financial profiles to third-party advertisers. Your data is your property.</p>
                            </section>

                            <section>
                                <h2 className="text-lg font-bold text-white mb-2">4. ACCESS BROWSER PERMISSIONS</h2>
                                <p>Camera and file access are requested solely for the purpose of OCR Receipt Scanning. Images are processed in cache and not permanently stored unless explicitly saved to the vault ledger.</p>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default LegalDocs;
