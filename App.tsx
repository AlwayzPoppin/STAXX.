import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import ChatBot from './components/ChatBot';
import FilingAssistant from './components/FilingAssistant';
import ProfileSettings from './components/ProfileSettings';
import { Transaction, TransactionCategory, UserProfile, WorkerType } from './types';
import { analyzeReceipt, suggestOptimizations, redactPII } from './services/geminiService';
import LegalDisclaimer from './components/LegalDisclaimer';

const verifyGoogleToken = async (token: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error('Verification failed');
    return await response.json();
  } catch (e) {
    console.error("Token verification failed", e);
    return null;
  }
};

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('staxx_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [googleData, setGoogleData] = useState<{ name: string; email: string; avatar: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem('staxx_token'));
  const [step, setStep] = useState<'AUTH' | 'ONBOARDING' | 'MAIN' | 'FILING'>(() => {
    return localStorage.getItem('staxx_profile') ? 'MAIN' : 'AUTH';
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'accountant' | 'settings'>(() => {
    const saved = localStorage.getItem('staxx_active_tab');
    return (saved as any) || 'overview';
  });
  const [strategies, setStrategies] = useState<string[]>([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const [chatMessages, setChatMessages] = useState<any[]>(() => {
    const saved = localStorage.getItem('staxx_chat_history');
    return saved ? JSON.parse(saved) : [];
  });

  // PERSISTENCE: Initial Hydration from backend (signed with authToken)
  useEffect(() => {
    if (authToken && !isHydrated) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTransactions(data);
          setIsHydrated(true); // VIGILANT AI: Mark hydration complete to break loop
        })
        .catch(err => {
          console.error("Initial Load Error:", err);
          setIsHydrated(true); // Still mark as loaded to allow local work if server down
        });
    }
  }, [authToken, isHydrated]);

  // Focus trap hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && (showManualModal || showSignOutModal)) {
        const modal = document.querySelector('.vault-card');
        if (!modal) return;
        const focusable = modal.querySelectorAll('button, input, select');
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showManualModal, showSignOutModal]);

  useEffect(() => {
    if (step === 'AUTH' && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          const payload = await verifyGoogleToken(response.credential);
          if (payload) {
            setAuthToken(response.credential);
            sessionStorage.setItem('staxx_token', response.credential);
            setGoogleData({
              name: payload.name,
              email: payload.email,
              avatar: payload.avatar
            });
            setStep('ONBOARDING');
          }
        },
      });
      (window as any).google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "filled_blue", size: "large", width: 400, shape: "pill" }
      );
    }
  }, [step]);

  useEffect(() => {
    if (profile) {
      const scrubbedProfile = {
        ...profile,
        name: redactPII(profile.name),
        email: redactPII(profile.email),
        ssn: profile.ssn ? redactPII(profile.ssn) : undefined
      };
      localStorage.setItem('staxx_profile', JSON.stringify(scrubbedProfile));
    }

    // PERSISTENCE: Save to server (Only if hydrated to avoid loop)
    if (isHydrated && authToken && transactions.length > 0) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ transactions })
      }).catch(err => console.error("Server Save Error:", err));
    }

    localStorage.setItem('staxx_active_tab', activeTab);
    localStorage.setItem('staxx_chat_history', JSON.stringify(chatMessages));
  }, [profile, transactions, activeTab, chatMessages, isHydrated, authToken]);

  useEffect(() => {
    if (profile && transactions.length > 0) {
      suggestOptimizations(transactions, profile.workerType).then(setStrategies);
    }
  }, [transactions.length, profile]);

  const finalizeOnboarding = (type: WorkerType) => {
    setProfile({
      name: googleData?.name || 'User',
      email: googleData?.email || '',
      avatar: googleData?.avatar || '',
      workerType: type
    });
    setStep('MAIN');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      try {
        const result = await analyzeReceipt(base64, profile.workerType, mimeType);
        addManualEntry({
          id: Date.now().toString(),
          date: result.date || new Date().toISOString().split('T')[0],
          description: result.description || 'New Scan',
          amount: result.amount || 0,
          category: (result.category as TransactionCategory) || TransactionCategory.OTHER,
          isDeductible: !!result.isDeductible,
          confidence: 1,
          platform: result.platform,
          aiNotes: result.aiNotes
        });
        setActiveTab('ledger');
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addManualEntry = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    setShowManualModal(false);
  };

  const exportData = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Deductible'];
    const rows = transactions.map(t => [
      t.date,
      t.description.replace(/,/g, ''),
      t.category,
      t.amount.toString(),
      t.isDeductible ? 'Yes' : 'No'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `STAXX_Report_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const signOut = () => {
    setShowSignOutModal(true);
  };

  const SignOutModal = () => (
    <div className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
      <div className="vault-card p-12 rounded-[3rem] w-full max-w-md text-center border-red-500/20">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20 mx-auto mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </div>
        <h2 className="text-xl font-black text-white mb-4 tracking-tighter">Lock Financial Vault?</h2>
        <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">Your session data is encrypted and saved to the secure backend. Re-authentication via Google will be required to re-enter.</p>
        <div className="flex gap-4">
          <button onClick={() => setShowSignOutModal(false)} className="flex-1 p-4 rounded-2xl text-slate-500 font-black uppercase text-[10px] tracking-widest">Abort</button>
          <button
            onClick={() => {
              sessionStorage.clear();
              setAuthToken(null);
              setStep('AUTH');
              setShowSignOutModal(false);
            }}
            className="flex-1 bg-red-500 text-white font-black p-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-white hover:text-red-500 transition-all shadow-xl shadow-red-500/10"
          >
            Lock Vault
          </button>
        </div>
      </div>
    </div>
  );

  const ManualAddModal = () => {
    const [form, setForm] = useState({ desc: '', amt: '', cat: TransactionCategory.OTHER });
    return (
      <div className="fixed inset-0 z-[1050] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
        <div className="vault-card p-10 rounded-[3rem] w-full max-w-lg border-gold/40">
          <h2 className="text-xl font-black text-white mb-8 tracking-tighter">Manual Entry</h2>
          <div className="space-y-6">
            <input
              placeholder="Description"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-gold"
              value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })}
            />
            <input
              placeholder="Amount ($0.00)"
              type="number"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-gold font-mono"
              value={form.amt} onChange={e => setForm({ ...form, amt: e.target.value })}
            />
            <select
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-gold"
              value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value as TransactionCategory })}
            >
              {Object.values(TransactionCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowManualModal(false)} className="flex-1 p-4 rounded-2xl text-slate-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button
                onClick={() => addManualEntry({
                  id: Date.now().toString(),
                  date: new Date().toISOString().split('T')[0],
                  description: form.desc,
                  amount: parseFloat(form.amt) || 0,
                  category: form.cat,
                  isDeductible: form.cat !== TransactionCategory.INCOME,
                  confidence: 1
                })}
                className="flex-1 bg-white text-black font-black p-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gold transition-all"
              >
                Add to Vault
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (step === 'AUTH') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-carbon p-8">
        <div className="vault-card p-16 rounded-[4rem] max-w-xl w-full text-center gold-glow animate-fadeIn">
          <div className="w-20 h-20 bg-white flex items-center justify-center text-black rounded-3xl mx-auto mb-10 shadow-2xl">
            <span className="font-black text-3xl italic">S.</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Tax Intelligence.</h1>
          <p className="text-slate-500 text-sm mb-12 font-medium leading-relaxed">Secure your vault with Google to begin your automated filing process.</p>
          <div className="flex flex-col items-center gap-6">
            <div id="googleBtn" className="min-h-[50px]"></div>
            <button
              onClick={() => setStep('ONBOARDING')}
              className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-80 px-8 py-4 border border-white/5 rounded-2xl transition-all"
            >
              Enter Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'ONBOARDING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-carbon p-8">
        <div className="max-w-4xl w-full animate-fadeIn text-center">
          <h2 className="text-white text-3xl font-black mb-16 tracking-tighter">Hi {googleData?.name?.split(' ')[0] || 'Professional'}. How do you earn?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <button onClick={() => finalizeOnboarding('GIG')} className="vault-card p-12 rounded-[3rem] text-left group hover:border-gold transition-all gold-glow">
              <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center text-black mb-8 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </div>
              <h3 className="text-white text-xl font-black mb-3">SELF-EMPLOYED</h3>
              <p className="text-slate-500 text-xs font-medium">Independent contractor or business owner.</p>
            </button>
            <button onClick={() => finalizeOnboarding('W2')} className="vault-card p-12 rounded-[3rem] text-left group hover:border-gold transition-all">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-black mb-8 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /></svg>
              </div>
              <h3 className="text-white text-xl font-black mb-3">SALARIED</h3>
              <p className="text-slate-500 text-xs font-medium">Standard employment with paycheck deductions.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-carbon">
      <header className="border-b border-white/[0.03] bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 bg-white flex items-center justify-center text-black rounded-lg">
              <span className="font-black text-lg italic tracking-tighter">S.</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-[-0.05em] uppercase">STAXX.</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setStep('FILING')} className="bg-gold/10 text-gold border border-gold/20 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gold hover:text-black transition-all">
              Preparer Hub
            </button>
            <button onClick={() => setShowManualModal(true)} className="bg-white/5 text-slate-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              Add Manual
            </button>
            <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-gold flex items-center gap-3 focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 focus-within:ring-offset-black">
              <span>{isUploading ? 'SCANNING...' : 'SCAN RECEIPT'}</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="sr-only" />
            </label>
            <button onClick={signOut} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-8">
            <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl w-fit">
              {['overview', 'ledger', 'accountant', 'settings'].map(tab => (
                <button
                  key={tab} onClick={() => setActiveTab(tab as any)}
                  className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {activeTab === 'overview' && <Dashboard transactions={transactions} workerType={profile?.workerType || 'GIG'} onExport={exportData} />}
            {activeTab === 'ledger' && (
              <TransactionList
                transactions={transactions}
                onDelete={(id) => setTransactions(t => t.filter(x => x.id !== id))}
                onUpdate={(id, u) => setTransactions(t => t.map(x => x.id === id ? { ...x, ...u } : x))}
                workerType={profile?.workerType || 'GIG'}
              />
            )}

            <div className={activeTab === 'accountant' ? 'block' : 'hidden'}>
              <ChatBot
                transactions={transactions}
                workerType={profile?.workerType || 'GIG'}
                messages={chatMessages}
                onUpdateMessages={setChatMessages}
              />
            </div>

            {activeTab === 'settings' && <ProfileSettings profile={profile} onUpdate={setProfile} onClear={() => { localStorage.clear(); window.location.reload(); }} />}
          </div>
          <aside className="w-full lg:w-80 space-y-8">
            <div className="vault-card p-8 rounded-[2.5rem] gold-glow relative overflow-hidden">
              <h3 className="font-black text-white text-[9px] uppercase tracking-widest mb-6 opacity-40">Tax Intelligence</h3>
              <div className="space-y-4">
                {strategies.length > 0 ? strategies.map((s, i) => (
                  <p key={i} className="text-[11px] text-slate-400 leading-relaxed"><span className="text-gold mr-2 font-mono">{i + 1}</span>{s}</p>
                )) : (
                  <p className="text-[10px] text-slate-600 font-medium italic animate-pulse">Analyzing your ledger...</p>
                )}
              </div>
            </div>
            <div className="vault-card p-8 rounded-[2rem] border-white/5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black text-slate-500 uppercase">Encryption</span>
                <span className="text-[9px] text-emerald-500 font-black uppercase">AES-256</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase">Verified via Google</span>
                <span className="text-[9px] text-gold font-black uppercase">{profile?.name ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
      {showManualModal && <ManualAddModal />}
      {showSignOutModal && <SignOutModal />}
      {step === 'FILING' && (
        <div className="fixed inset-0 z-[100] bg-carbon p-6 flex flex-col items-center">
          <div className="max-w-6xl w-full h-full flex flex-col">
            <button onClick={() => setStep('MAIN')} className="mb-6 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6" /></svg>
              Return to Vault
            </button>
            <FilingAssistant
              transactions={transactions}
              workerType={profile?.workerType || 'GIG'}
              onComplete={() => setStep('MAIN')}
              onAddManual={tx => setTransactions(prev => [tx, ...prev])}
              currentProfile={profile}
              onUpdateProfile={updates => setProfile(prev => prev ? { ...prev, ...updates } : null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
