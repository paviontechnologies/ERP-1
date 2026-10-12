'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users2,
  Plus,
  CheckCircle2,
  Download,
  RefreshCw,
  CalendarCheck,
  CreditCard,
  Briefcase,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export default function HRMSPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll'>('employees');

  // Payroll modal state
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(10);
  const [payrollYear, setPayrollYear] = useState(2026);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchHRMS = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hrms');
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRMS();
  }, []);

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hrms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RUN_PAYROLL',
          month: Number(payrollMonth),
          year: Number(payrollYear),
          userId: currentUser.email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPayrollModalOpen(false);
        setActionMessage(`Monthly Payroll for ${payrollMonth}/${payrollYear} generated for ${json.result.count} staff!`);
        fetchHRMS();
      } else {
        alert(json.error || 'Failed to run payroll');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePayroll = async (payrollRunId: string) => {
    if (!confirm('Approve and finalize this payroll run? This will disburse net salaries and debit Operating Expense in General Ledger.')) return;
    try {
      const res = await fetch('/api/hrms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_PAYROLL',
          payrollRunId,
          userId: currentUser.email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage('Payroll disbursed and financial ledger journal posted successfully!');
        fetchHRMS();
      } else {
        alert(json.error || 'Failed to approve payroll');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const { employees, attendance, payrollRuns } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">HRMS & Payroll Automation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Hire-to-Retire lifecycle: Employee rosters, live biometric attendance, payroll calculation & payslips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?entity=employees"
            download
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Staff</span>
          </a>

          <button
            onClick={() => setIsPayrollModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Calculate Monthly Payroll</span>
          </button>
        </div>
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

      {/* HR KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">Total Headcount</span>
          <div className="text-xl font-bold text-white mt-1">{attendance.totalEmployees} Employees</div>
          <span className="text-[11px] text-slate-400">Across 9 departments</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">Today's Attendance</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{attendance.attendanceRate}%</div>
          <span className="text-[11px] text-slate-400">{attendance.presentCount} Staff Active Today</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">Remote / WFH</span>
          <div className="text-xl font-bold text-blue-400 mt-1">{attendance.wfhCount} Staff</div>
          <span className="text-[11px] text-slate-400">Telecommuting</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">On Leave</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{attendance.onLeaveCount} Staff</div>
          <span className="text-[11px] text-slate-400">Approved leaves</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'employees' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Employee Directory ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'attendance' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Daily Attendance Logs ({attendance.attendances.length})
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'payroll' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Monthly Payroll Runs ({payrollRuns.length})
        </button>
      </div>

      {/* Tab 1: Employee Directory */}
      {activeTab === 'employees' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Emp Code</th>
                  <th className="px-4 py-3 font-semibold">Employee Name</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Designation</th>
                  <th className="px-4 py-3 font-semibold">Base Salary</th>
                  <th className="px-4 py-3 font-semibold">Allowances</th>
                  <th className="px-4 py-3 font-semibold">Net Salary</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {employees.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-400">{e.employeeCode}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {e.firstName} {e.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{e.department.name}</td>
                    <td className="px-4 py-3 text-slate-400">{e.designation}</td>
                    <td className="px-4 py-3 font-mono">₹{e.baseSalary.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">₹{e.allowances.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      ₹{(e.baseSalary + e.allowances - e.deductions).toLocaleString('en-IN')}
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

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {attendance.attendances.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      {a.employee.firstName} {a.employee.lastName} ({a.employee.employeeCode})
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {new Date(a.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          a.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : a.status === 'WORK_FROM_HOME'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{a.workingHours} Hours</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payroll Runs */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {payrollRuns.map((pr: any) => (
            <div key={pr.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base">
                    Monthly Payroll Run: Month {pr.month}/{pr.year}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Processed for {pr.employeeCount} eligible employees across departments.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      pr.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {pr.status}
                  </span>

                  {pr.status !== 'APPROVED' && (
                    <button
                      onClick={() => handleApprovePayroll(pr.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Authorize Disbursement
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Gross Salary</span>
                  <span className="font-semibold text-white">₹{pr.totalGrossSalary.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Allowances</span>
                  <span className="font-semibold text-emerald-400">₹{pr.totalAllowances.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Deductions & Taxes</span>
                  <span className="font-semibold text-rose-400">₹{pr.totalDeductions.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Net Disbursement</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{pr.totalNetSalary.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Run Monthly Payroll */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Calculate Monthly Payroll</h3>
            <form onSubmit={handleRunPayroll} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Month (1 - 12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Fiscal Year</label>
                  <input
                    type="number"
                    value={payrollYear}
                    onChange={(e) => setPayrollYear(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-200 text-xs">
                The engine will aggregate approved attendance, apply statutory deductions, generate individual employee payslips, and route for executive financial authorization.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
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
                  <span>Execute Payroll Engine</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
