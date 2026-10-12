'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Landmark,
  Plus,
  CheckCircle2,
  Download,
  RefreshCw,
  TrendingUp,
  Receipt,
  PieChart as PieChartIcon,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

export default function FinancePage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>({ accounts: [], journalEntries: [], budgets: [], expenses: [], budgetAnalysis: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'coa' | 'journal' | 'expenses' | 'budget'>('coa');

  // New Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Operating Supplies');
  const [expenseAmount, setExpenseAmount] = useState(25000);
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.budgetAnalysis && json.budgetAnalysis.length > 0 && !selectedDept) {
          setSelectedDept(json.budgetAnalysis[0].departmentCode);
        }
      } else {
        setData({ accounts: [], journalEntries: [], budgets: [], expenses: [], budgetAnalysis: [] });
      }
    } catch (err) {
      console.error(err);
      setData({ accounts: [], journalEntries: [], budgets: [], expenses: [], budgetAnalysis: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Find matching department id
      const deptObj = data.budgetAnalysis.find((b: any) => b.departmentCode === selectedDept);
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_EXPENSE',
          departmentId: deptObj ? deptObj.departmentId : undefined,
          title: expenseTitle,
          category: expenseCategory,
          amount: Number(expenseAmount),
          userId: currentUser.email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsExpenseModalOpen(false);
        setActionMessage(`Expense of ₹${expenseAmount.toLocaleString('en-IN')} posted and debited to department budget!`);
        fetchFinance();
      } else {
        alert(json.error || 'Failed to record expense');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const { accounts, journalEntries, expenses, budgetAnalysis } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Finance & General Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative double-entry accounting, Chart of Accounts, Journal entries & departmental budget tracking.
          </p>
        </div>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post Operating Expense</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('coa')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'coa' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Chart of Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'journal' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          General Ledger Journal ({journalEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'budget' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Department Budgets ({budgetAnalysis.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'expenses' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Expense Vouchers ({expenses.length})
        </button>
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === 'coa' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account Code</th>
                  <th className="px-4 py-3 font-semibold">Account Name</th>
                  <th className="px-4 py-3 font-semibold">Classification Type</th>
                  <th className="px-4 py-3 font-semibold">Sub-Type</th>
                  <th className="px-4 py-3 font-semibold">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {accounts.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">{a.code}</td>
                    <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          a.type === 'ASSET'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : a.type === 'LIABILITY'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : a.type === 'REVENUE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{a.subType}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      ₹{a.balance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Journal Entries */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {journalEntries.map((je: any) => (
            <div key={je.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-blue-400">{je.entryNumber}</span>
                  <span className="text-white text-xs font-medium">{je.description}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(je.entryDate).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1 divide-y divide-slate-800/40 text-xs">
                {je.lines.map((l: any) => (
                  <div key={l.id} className="pt-1 flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">
                        [{l.account.code}] {l.account.name}
                      </span>
                      {l.description && (
                        <span className="text-slate-400 text-[11px] ml-2">({l.description})</span>
                      )}
                    </div>
                    <div className="flex gap-4 font-mono">
                      <span className="text-emerald-400 w-24 text-right">
                        {l.debit > 0 ? `DR ₹${l.debit.toLocaleString('en-IN')}` : '-'}
                      </span>
                      <span className="text-blue-400 w-24 text-right">
                        {l.credit > 0 ? `CR ₹${l.credit.toLocaleString('en-IN')}` : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Budget Analysis */}
      {activeTab === 'budget' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Allocated Budget</th>
                  <th className="px-4 py-3 font-semibold">Actual Spent</th>
                  <th className="px-4 py-3 font-semibold">Remaining Funds</th>
                  <th className="px-4 py-3 font-semibold">Utilization %</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {budgetAnalysis.map((b: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{b.departmentName}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{b.departmentCode}</td>
                    <td className="px-4 py-3 font-mono font-semibold">₹{b.allocated.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono text-rose-400">₹{b.spent.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                      ₹{b.remaining.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono">{b.utilization}%</td>
                    <td className="px-4 py-3">
                      {b.isExceeded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Exceeded
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          On Track
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Expenses */}
      {activeTab === 'expenses' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Total (incl Tax)</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{e.title}</td>
                    <td className="px-4 py-3 text-slate-300">{e.department?.name || 'General'}</td>
                    <td className="px-4 py-3 text-slate-400">{e.category}</td>
                    <td className="px-4 py-3 font-mono">₹{e.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      ₹{e.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {new Date(e.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Record Operating Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Post Department Expense</h3>
            <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Server hosting & cloud telemetry"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {budgetAnalysis.map((b: any) => (
                    <option key={b.departmentCode} value={b.departmentCode}>
                      {b.departmentName} (Remaining: ₹{b.remaining.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Post & Debit Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
