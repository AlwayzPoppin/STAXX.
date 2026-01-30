
import React, { useState, useEffect, useRef } from 'react';
import { guideFiling, generateFormDraft, analyzeTaxDocument } from '../services/geminiService';
import { FilingStep, Transaction, WorkerType, Message, UserProfile, LegalDocument } from '../types';

interface Props {
  transactions: Transaction[];
  workerType: WorkerType;
  onComplete: () => void;
  onAddManual: (transaction: Transaction) => void;
  currentProfile: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

const FilingAssistant: React.FC<Props> = ({ transactions, workerType, onComplete, onAddManual, currentProfile, onUpdateProfile }) => {
  const [currentStep, setCurrentStep] = useState<FilingStep>(() => {
    const saved = localStorage.getItem('staxx_filing_step');
    return (saved as FilingStep) || FilingStep.PROFILE;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('staxx_filing_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<any[]>(() => {
    const saved = localStorage.getItem('staxx_filing_forms');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeFormIndex, setActiveFormIndex] = useState(0);
  const [showForms, setShowForms] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>(() => {
    const saved = localStorage.getItem('staxx_filing_docs');
    return saved ? JSON.parse(saved) : [];
  });
  const [showLegalModal, setShowLegalModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const steps = [FilingStep.PROFILE, FilingStep.DOCUMENTS, FilingStep.INCOME, FilingStep.EXPENSES, FilingStep.SUMMARY];

  useEffect(() => {
    if (messages.length === 0) startStep(currentStep);
    updateFormDraft();
  }, [transactions, currentStep]);

  useEffect(() => {
    localStorage.setItem('staxx_filing_step', currentStep);
    localStorage.setItem('staxx_filing_messages', JSON.stringify(messages));
    localStorage.setItem('staxx_filing_forms', JSON.stringify(forms));
    localStorage.setItem('staxx_filing_docs', JSON.stringify(legalDocuments));
  }, [currentStep, messages, forms, legalDocuments]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const updateFormDraft = async () => {
    const draft = await generateFormDraft(transactions, workerType);
    if (draft?.forms) setForms(draft.forms);
  };

  const startStep = async (step: FilingStep) => {
    setIsLoading(true);
    const result = await guideFiling(step, transactions, workerType, undefined, currentProfile);
    setMessages(prev => [...prev, { role: 'model', text: result.text, timestamp: new Date() }]);
    setIsLoading(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: input, timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);
    const result = await guideFiling(currentStep, transactions, workerType, userMsg, currentProfile);
    if (result.profileUpdate) onUpdateProfile(result.profileUpdate);
    setMessages(prev => [...prev, { role: 'model', text: result.text, timestamp: new Date() }]);
    setIsLoading(false);
    updateFormDraft();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const data = await analyzeTaxDocument(base64, 'IRS Form');
      const newDoc: LegalDocument = {
        id: Math.random().toString(),
        type: 'OTHER',
        fileName: file.name,
        uploadDate: new Date().toLocaleDateString(),
        status: 'VERIFIED',
        extractedData: data
      };
      setLegalDocuments(prev => [...prev, newDoc]);
      setMessages(prev => [...prev, { role: 'model', text: `I've successfully parsed your ${file.name}. Verification complete.`, timestamp: new Date() }]);
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const next = steps[currentIndex + 1];
      setCurrentStep(next);
      startStep(next);
    } else {
      setShowLegalModal(true);
    }
  };

  const finalizeFiling = () => {
    setIsFinished(true);
    setTimeout(onComplete, 2500);
  };

  if (isFinished) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-fadeIn">
        <div className="w-24 h-24 bg-gold rounded-full flex items-center justify-center text-black mb-8 shadow-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Package Sealed.</h2>
        <p className="text-slate-500 font-medium">Your 2024 Tax Return is ready for submission.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      <div className="vault-card rounded-[2.5rem] p-6 bg-black/60 flex items-center justify-between border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full ${steps.indexOf(currentStep) >= i ? 'bg-gold gold-glow' : 'bg-white/5'}`} />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gold">STEP: {currentStep}</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowForms(!showForms)} className="bg-white/5 text-slate-400 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white">
            {showForms ? 'Chat' : 'Review Forms'}
          </button>
          <button onClick={nextStep} className="bg-white text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold transition-all">
            {currentStep === FilingStep.SUMMARY ? 'Final Review' : 'Proceed'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
        <div className="lg:col-span-8 flex flex-col vault-card rounded-[3rem] bg-black/40 border-white/5 overflow-hidden">
          {showForms ? (
            <div className="flex-1 flex flex-col p-10 overflow-hidden">
              <div className="flex gap-4 mb-8">
                {forms.map((f, i) => (
                  <button key={i} onClick={() => setActiveFormIndex(i)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeFormIndex === i ? 'bg-gold text-black border-gold' : 'bg-white/5 text-slate-500 border-white/10 hover:text-white'}`}>
                    {f.title}
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-white rounded-2xl p-10 overflow-y-auto text-black font-serif custom-scrollbar-light">
                <h1 className="text-3xl font-black italic mb-8 border-b-4 border-black pb-4">{forms[activeFormIndex]?.title || 'Loading Draft...'}</h1>
                <div className="space-y-8">
                  {forms[activeFormIndex]?.sections?.map((s: any, idx: number) => (
                    <div key={idx}>
                      <div className="bg-slate-100 p-2 font-black text-[10px] uppercase mb-4 border-l-4 border-black">{s.label}</div>
                      <div className="space-y-2">
                        {s.lines?.map((l: any, lineIdx: number) => (
                          <div key={lineIdx} className="flex items-center gap-4 text-xs">
                            <span className="w-10 text-slate-400 font-bold">{l.lineId}</span>
                            <span className="flex-1 border-b border-dotted border-slate-300 pb-1">{l.description}</span>
                            <span className="w-24 font-mono font-bold text-right">${l.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-[2rem] text-[13px] leading-relaxed border ${m.role === 'user' ? 'bg-gold text-black border-gold rounded-tr-none' : 'bg-white/5 text-slate-300 border-white/5 rounded-tl-none'
                      }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="p-8 border-t border-white/5 bg-black/40 flex gap-4">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Answer AI or ask about laws..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-gold" />
                <button className="bg-white text-black px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest">Send</button>
              </form>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6 flex flex-col min-h-0">
          <div className="vault-card p-8 rounded-[3rem] bg-black/60 border-white/5">
            <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-6">Identity Verification</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-[11px] text-slate-400">Legal Name</span><span className="text-[11px] text-white font-bold">{currentProfile?.name || '---'}</span></div>
              <div className="flex justify-between items-center"><span className="text-[11px] text-slate-400">SSN Mapped</span><span className="text-[11px] text-emerald-500 font-bold">YES</span></div>
              <div className="flex justify-between items-center"><span className="text-[11px] text-slate-400">Filing Status</span><span className="text-[11px] text-gold font-bold">{currentProfile?.filingStatus || 'PENDING'}</span></div>
            </div>
          </div>

          <div className="vault-card p-8 rounded-[3rem] flex-1 flex flex-col border-white/5">
            <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-6">Legal Document Vault</h3>
            <div className="space-y-4 mb-6 overflow-y-auto custom-scrollbar flex-1">
              {legalDocuments.map((doc) => (
                <div key={doc.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-white font-bold truncate max-w-[120px]">{doc.fileName}</p>
                    <p className="text-[9px] text-slate-500 uppercase mt-1">Verified {doc.uploadDate}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg></div>
                </div>
              ))}
            </div>
            <label className="cursor-pointer bg-white text-black text-center py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-gold">
              Upload W-2 / 1099
              <input type="file" accept="image/*,application/pdf" onChange={handleDocUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {showLegalModal && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-fadeIn">
          <div className="vault-card p-12 rounded-[3rem] max-w-2xl w-full border-gold/40">
            <h2 className="text-2xl font-black text-white mb-6">Final Review & Sign</h2>
            <div className="bg-black/40 rounded-2xl p-6 mb-8 text-slate-400 text-xs leading-relaxed space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
              <p>Under penalties of perjury, I declare that I have examined this return and accompanying schedules and statements, and to the best of my knowledge and belief, they are true, correct, and complete.</p>
              <p>By clicking "Sign and File," I authorize STAXX. Intelligence to prepare these documents based on the information provided. I understand that STAXX. is an AI-assisted tool and I am responsible for the final accuracy of my filing.</p>
              <p>Section 7206(1) of the Internal Revenue Code makes it a felony to willfully make and subscribe any return, statement, or other document that contains or is verified by a written declaration that it is made under the penalties of perjury and that the person does not believe to be true and correct as to every material matter.</p>
            </div>
            <div className="flex gap-6">
              <button onClick={() => setShowLegalModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Back</button>
              <button onClick={finalizeFiling} className="flex-1 bg-gold text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Sign & Seal Vault</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,184,0,0.2); border-radius: 10px; }
        .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FilingAssistant;
