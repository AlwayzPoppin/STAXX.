import React, { useState } from 'react';
import { Transaction, TransactionCategory, WorkerType } from '../types';
import { categorizeTransaction } from '../services/geminiService';

const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 0h6" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>;

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  workerType: WorkerType;
}

const TransactionList: React.FC<Props> = ({ transactions, onDelete, onUpdate, workerType }) => {
  const [categorizingIds, setCategorizingIds] = useState<Set<string>>(new Set());

  const handleCategorize = async (transaction: Transaction) => {
    onUpdate(transaction.id, { verified: true, aiNotes: 'Scanning Vault Intelligence...' });
    setCategorizingIds(prev => new Set(prev).add(transaction.id));

    try {
      const result = await categorizeTransaction(transaction.description, transaction.amount, workerType);

      // VIGILANT AI: Finding 5 - Use actual model confidence scores instead of hardcoded true/1
      const confidence = result.confidence || 0.5;
      const isVerified = confidence > 0.85;

      onUpdate(transaction.id, {
        category: (result.category as TransactionCategory) || TransactionCategory.OTHER,
        isDeductible: result.isDeductible,
        aiNotes: result.aiNotes,
        confidence: confidence,
        verified: isVerified
      });
    } catch (err) {
      console.error("AI Categorization failed", err);
      onUpdate(transaction.id, { verified: false, aiNotes: 'Verification Handshake Failed' });
    } finally {
      setCategorizingIds(prev => {
        const next = new Set(prev);
        next.delete(transaction.id);
        return next;
      });
    }
  };

  const handleVerifyAll = async () => {
    const unverified = transactions.filter(t => t.category === TransactionCategory.OTHER);
    if (unverified.length === 0) return;

    setCategorizingIds(prev => {
      const next = new Set(prev);
      unverified.forEach(t => next.add(t.id));
      return next;
    });

    const batchSize = 3;
    for (let i = 0; i < unverified.length; i += batchSize) {
      const batch = unverified.slice(i, i + batchSize);
      await Promise.all(batch.map(t => handleCategorize(t)));
    }
  };

  return (
    <div className="vault-card rounded-[2.5rem] overflow-hidden animate-fadeIn border-white/5 bg-black/40">
      <div className="p-8 border-b border-white/[0.03] flex justify-between items-center">
        <div>
          <h3 className="font-black text-xs uppercase tracking-[0.4em] text-white">Vault Ledger</h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Grounded Verification Active</p>
        </div>
        <div className="flex gap-3">
          {transactions.some(t => t.category === TransactionCategory.OTHER) && (
            <button
              onClick={handleVerifyAll}
              disabled={categorizingIds.size > 0}
              className="text-[10px] font-black px-6 py-2 bg-gold/10 text-gold border border-gold/20 rounded-xl uppercase hover:bg-gold hover:text-black transition-all disabled:opacity-50"
            >
              {categorizingIds.size > 0 ? 'Processing...' : 'Verify All'}
            </button>
          )}
          <span className="text-[10px] font-black px-4 py-2 bg-white/5 text-slate-400 border border-white/10 rounded-xl uppercase">
            {transactions.length} Records
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/5">
              <th className="px-4 md:px-10 py-6">Identity</th>
              <th className="px-4 md:px-10 py-6">Category</th>
              <th className="px-4 md:px-10 py-6 text-right">Value</th>
              <th className="px-4 md:px-10 py-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gold/[0.03] transition-all group">
                <td className="px-4 md:px-10 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white tracking-wide">{t.description}</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(t.date).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-4 md:px-10 py-6">
                  <div className="flex items-center gap-4">
                    <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border ${t.category === TransactionCategory.INCOME
                      ? 'bg-gold/10 text-gold border-gold/20'
                      : t.category === TransactionCategory.OTHER
                        ? 'bg-red-500/5 text-red-500/60 border-red-500/10'
                        : 'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                      {t.category.replace('_', ' ')}
                    </span>
                    {t.verified && (
                      <div className="flex items-center gap-1.5 text-emerald-500/60">
                        <IconSparkles />
                        <span className="text-[8px] font-black uppercase tracking-widest">AI Verified</span>
                      </div>
                    )}
                    {t.category === TransactionCategory.OTHER && (
                      <button
                        onClick={() => handleCategorize(t)}
                        disabled={categorizingIds.has(t.id)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white text-black hover:bg-gold transition-all ${categorizingIds.has(t.id) ? 'opacity-50 animate-pulse' : ''}`}
                      >
                        {categorizingIds.has(t.id) ? 'Scanning...' : 'Verify'}
                      </button>
                    )}
                  </div>
                </td>
                <td className={`px-4 md:px-10 py-6 text-sm font-bold text-right font-mono ${t.category === TransactionCategory.INCOME ? 'text-gold' : 'text-slate-200'}`}>
                  {t.category === TransactionCategory.INCOME ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 md:px-10 py-6 text-right">
                  <button
                    onClick={() => onDelete(t.id)}
                    className="text-slate-800 hover:text-red-500 transition-all"
                  >
                    <IconTrash />
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={4} className="p-20 text-center text-[10px] font-black uppercase text-slate-700 tracking-widest">Empty Vault Ledger</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
