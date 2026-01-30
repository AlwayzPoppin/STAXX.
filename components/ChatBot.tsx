
import React, { useState, useRef, useEffect } from 'react';
import { getTaxAdvice, generateSpeech } from '../services/geminiService';
import { Message, Transaction, WorkerType } from '../types';

interface Props {
  transactions: Transaction[];
  workerType: WorkerType;
  messages: Message[];
  onUpdateMessages: (messages: Message[]) => void;
}

const ChatBot: React.FC<Props> = ({ transactions, workerType, messages, onUpdateMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickQuestions = workerType === 'GIG'
    ? ["2024 write-off limits?", "Self-employment tax rates?", "IRS 1099 deadlines?"]
    : ["Standard deduction 2024?", "Can I claim moving expenses?", "Refund timeline 2025?"];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textToSend: string, e?: React.FormEvent) => {
    e?.preventDefault();
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', text, timestamp: new Date() };
    onUpdateMessages([...messages, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const context = `WorkerType: ${workerType}. Transactions: ${transactions.length}. Gross Income: $${transactions.filter(t => t.category === 'INCOME').reduce((a, b) => a + b.amount, 0)}`;
      const result = await getTaxAdvice(text, context, workerType);
      onUpdateMessages([...messages, userMsg, {
        role: 'model',
        text: result.text,
        timestamp: new Date(),
        sources: result.sources
      }]);
    } catch (error) {
      onUpdateMessages([...messages, userMsg, { role: 'model', text: "Vault connection interrupted. Retrying security handshake...", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-[calc(100dvh-12rem)] min-h-[500px] vault-card rounded-[2.5rem] overflow-hidden animate-fadeIn gold-glow border-gold/20">
      <div className="p-8 border-b border-white/[0.03] bg-black flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center text-black shadow-lg relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {isLoading && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></div>}
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-[0.3em] text-white">Tax Intelligence</h3>
            <p className="text-[9px] text-gold font-bold uppercase tracking-widest mt-1">Grounded in IRS 2024/2025 Laws</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 bg-black/20 scroll-smooth custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-[1.8rem] p-6 text-sm leading-relaxed relative ${m.role === 'user'
              ? 'bg-gold text-black font-bold rounded-tr-none'
              : 'bg-white/[0.03] text-slate-300 border border-white/[0.05] rounded-tl-none'
              }`}>
              {m.text}
            </div>

            {/* Render sources if available from Search tool grounding metadata */}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 max-w-[85%]">
                {m.sources.map((chunk, idx) => {
                  if (chunk.web) {
                    return (
                      <a
                        key={idx}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gold hover:bg-gold hover:text-black transition-all"
                      >
                        {chunk.web.title || 'Source'}
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.03] text-slate-500 border border-white/[0.05] rounded-[1.5rem] rounded-tl-none p-5 text-[9px] font-black uppercase tracking-widest flex items-center gap-3">
              <div className="flex gap-1"><div className="w-1 h-1 bg-gold rounded-full animate-bounce"></div><div className="w-1 h-1 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-1 h-1 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div></div>
              Accessing Grounded Sources
            </div>
          </div>
        )}
      </div>

      <div className="px-8 pb-4">
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-[9px] font-black text-slate-500 uppercase tracking-widest hover:border-gold hover:text-gold transition-all disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => handleSend(input, e)} className="p-8 border-t border-white/[0.03] bg-black/60 flex gap-4">
        <label htmlFor="chat-input" className="sr-only">Ask a tax question</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about 2024/2025 tax rules..."
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 text-sm text-white focus:border-gold outline-none transition-all placeholder:text-slate-600 font-medium"
        />
        <button
          disabled={isLoading}
          className="bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] px-10 py-4 rounded-2xl hover:bg-gold transition-all shadow-xl disabled:opacity-50"
        >
          {isLoading ? 'Wait' : 'Query'}
        </button>
      </form>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,184,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ChatBot;