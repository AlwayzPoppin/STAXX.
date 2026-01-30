import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, TaxSummary, TransactionCategory, WorkerType } from '../types';
import { calculateTaxSummary } from '../utils/taxCalculations';

interface DashboardProps {
  transactions: Transaction[];
  workerType: WorkerType;
  userState?: string;
  onExport?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, workerType, userState, onExport }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate initial data loading/analysis
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const summary: TaxSummary = useMemo(() => {
    return calculateTaxSummary(transactions, workerType, userState);
  }, [transactions, workerType, userState]);

  const deadlines = useMemo(() => {
    if (workerType === 'GIG') {
      return [
        { label: 'Q1 ESTIMATED', date: 'APR 15', status: 'Upcoming' },
        { label: 'Q2 ESTIMATED', date: 'JUN 17', status: 'Pending' },
        { label: '2024 RETURN', date: 'APR 15', status: 'CRITICAL' }
      ];
    }
    return [
      { label: 'W-2 RECEIPT', date: 'JAN 31', status: 'Completed' },
      { label: '2024 RETURN', date: 'APR 15', status: 'CRITICAL' }
    ];
  }, [workerType]);

  const chartData = useMemo(() => {
    const categories = Object.values(TransactionCategory);
    return categories.map(cat => ({
      name: cat.replace('_', ' ').toLowerCase(),
      value: transactions
        .filter(t => t.category === cat)
        .reduce((acc, t) => acc + t.amount, 0)
    })).filter(d => d.value > 0);
  }, [transactions]);

  const COLORS = ['#FFB800', '#F59E0B', '#D97706', '#1a1a1a', '#444444'];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter">Financial Vault</h2>
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Real-time Tax Projection</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {deadlines.map((d, i) => (
            <div key={i} className={`p-4 rounded-2xl border ${d.status === 'CRITICAL' ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'} flex flex-col items-center min-w-[100px]`}>
              <span className={`text-[11px] font-black uppercase tracking-widest ${d.status === 'CRITICAL' ? 'text-red-500' : 'text-slate-500'}`}>{d.label}</span>
              <span className="text-sm font-black text-white mt-1">{d.date}</span>
            </div>
          ))}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 text-xs font-black uppercase text-gold hover:text-white transition-colors bg-gold/5 px-6 py-4 rounded-2xl border border-gold/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
              Export
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="vault-card p-8 rounded-[2rem] animate-pulse">
                <div className="h-4 w-24 bg-white/5 rounded-full mb-4"></div>
                <div className="h-10 w-32 bg-white/10 rounded-xl"></div>
              </div>
            ))}
          </>
        ) : (
          <>
            <SummaryCard title="Gross Flow" value={summary.totalGrossIncome} color="text-white" />
            {workerType === 'GIG' ? (
              <SummaryCard title="Deductions" value={summary.totalBusinessExpenses} color="text-slate-500" />
            ) : (
              <SummaryCard title="IRS Withheld" value={summary.totalWithholding || 0} color="text-slate-500" />
            )}
            <SummaryCard title="Net Retained" value={summary.netProfit} color="text-gold" />
            <SummaryCard
              title={workerType === 'GIG' ? "Liability" : "Est. Refund"}
              value={workerType === 'GIG' ? summary.estimatedTaxLiability : (summary.projectedRefund || 0)}
              color={workerType === 'GIG' ? "text-amber-600" : "text-emerald-500"}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="vault-card p-10 rounded-[2.5rem] gold-glow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full"></div>
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-10">Allocation Radar</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-48 h-48 border-8 border-white/5 border-t-gold rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter(d => d.name !== 'income')}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px', fontSize: '12px' }}
                    itemStyle={{ color: '#FFB800' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="vault-card p-10 rounded-[2.5rem]">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-10">Profit Velocity</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="flex items-end gap-4 h-full pt-10 px-10">
                <div className="flex-1 bg-white/5 h-1/2 rounded-t-xl animate-pulse"></div>
                <div className="flex-1 bg-white/5 h-3/4 rounded-t-xl animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="flex-1 bg-white/5 h-full rounded-t-xl animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Flow', income: summary.totalGrossIncome, profit: summary.netProfit }]}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#111" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#0a0a0a' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar name="Total Income" dataKey="income" fill="#1a1a1a" radius={[12, 12, 0, 0]} barSize={50} />
                  <Bar name="Net Profit" dataKey="profit" fill="#FFB800" radius={[12, 12, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, color }: { title: string, value: number, color: string }) => (
  <div className="vault-card p-8 rounded-[2rem] hover:border-gold group transition-all duration-700">
    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-gold transition-colors">{title}</p>
    <p className={`text-3xl font-black mt-3 font-mono tracking-tighter ${color}`}>
      ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </p>
  </div>
);

export default Dashboard;
