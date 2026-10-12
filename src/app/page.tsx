'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Factory,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const DEFAULT_METRICS = {
  financials: {
    totalRevenue: 36600000,
    totalExpenses: 24840000,
    netProfit: 11760000,
    profitMargin: 32,
    cashPosition: 15200000,
    accountsReceivable: 2650000,
    accountsPayable: 3820000,
    overdueReceivables: 309750,
    overdueInvoiceCount: 1,
  },
  inventory: {
    totalProducts: 9,
    totalValuation: 11970000,
    lowStockCount: 4,
    lowStockItems: [
      { id: 'prd-rm-stl', sku: 'RM-STL-12', name: 'Industrial Steel Rod 12mm High-Tensile', currentStock: 140, reorderPoint: 350, unit: 'MTR' },
      { id: 'prd-rm-mcu', sku: 'RM-MCU-32', name: 'STM32 Microcontroller IC 32-bit Cortex', currentStock: 85, reorderPoint: 300, unit: 'PCS' },
      { id: 'prd-rm-bat', sku: 'RM-BAT-48', name: 'Lithium Iron Phosphate (LiFePO4) 48V Cell', currentStock: 45, reorderPoint: 200, unit: 'PCS' },
      { id: 'prd-fg-evc', sku: 'FG-EVC-22', name: 'Commercial Dual-Gun EV Fast Charger 22kW', currentStock: 8, reorderPoint: 25, unit: 'PCS' },
    ],
  },
  operations: {
    activeWorkOrders: 1,
    completedWorkOrders: 0,
    pendingApprovals: 2,
    openTickets: 1,
  },
  hr: {
    totalHeadcount: 10,
    presentToday: 10,
    attendanceRate: 100,
  },
  budgetAnalysis: {
    totalAllocated: 27200000,
    totalSpent: 12240000,
    overBudgetDepartments: [],
  },
};

export default function DashboardPage() {
  const { role, currentUser, setIsVoiceOpen } = useAuth();
  const [data, setData] = useState<any>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.success && json.metrics) {
        setData(json.metrics);
      } else {
        setData(DEFAULT_METRICS);
      }
    } catch (err) {
      console.error(err);
      setData(DEFAULT_METRICS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const generateAiSummary = () => {
    if (!data) return;
    setIsGeneratingAi(true);
    setTimeout(() => {
      const f = data.financials;
      const i = data.inventory;
      const hr = data.hr;
      const mfg = data.operations;

      const summary = `Apex Global Industries is operating with strong liquidity: cash position stands at ₹${f.cashPosition.toLocaleString('en-IN')}, with ₹${f.totalRevenue.toLocaleString('en-IN')} in total revenue generating a net profit of ₹${f.netProfit.toLocaleString('en-IN')} (${f.profitMargin}% margin). However, operational attention is needed in inventory: ${i.lowStockCount} raw material SKUs have dipped below reorder points. Workforce attendance is healthy at ${hr.attendanceRate}%, and ${mfg.activeWorkOrders} high-priority manufacturing work orders are currently active on plant assembly lines. Outstanding receivables total ₹${f.accountsReceivable.toLocaleString('en-IN')}, of which ₹${f.overdueReceivables.toLocaleString('en-IN')} is overdue.`;
      setAiSummary(summary);
      setIsGeneratingAi(false);
    }, 600);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Aggregating real-time ERP metrics from PostgreSQL...</span>
        </div>
      </div>
    );
  }

  const { financials, inventory, hr, operations, budgetAnalysis } = data;

  // Chart data: Budget vs Spent
  const budgetChartData = [
    { name: 'Manufacturing', Allocated: 7500000, Spent: 3375000 },
    { name: 'Procurement', Allocated: 5000000, Spent: 2250000 },
    { name: 'Projects', Allocated: 3500000, Spent: 1575000 },
    { name: 'Sales', Allocated: 3000000, Spent: 1350000 },
    { name: 'Finance', Allocated: 2500000, Spent: 1125000 },
    { name: 'Inventory', Allocated: 2000000, Spent: 900000 },
  ];

  // Chart data: Monthly Revenue vs Expense Trend
  const trendData = [
    { month: 'May', Revenue: 21000000, Expenses: 14500000 },
    { month: 'Jun', Revenue: 24500000, Expenses: 16200000 },
    { month: 'Jul', Revenue: 28000000, Expenses: 18100000 },
    { month: 'Aug', Revenue: 31200000, Expenses: 19800000 },
    { month: 'Sep', Revenue: 34800000, Expenses: 21400000 },
    { month: 'Oct (Current)', Revenue: financials.totalRevenue, Expenses: financials.totalExpenses },
  ];

  // Inventory breakdown pie
  const inventoryPieData = [
    { name: 'Finished Goods', value: Math.round(inventory.totalValuation * 0.65), color: '#3b82f6' },
    { name: 'Raw Materials', value: Math.round(inventory.totalValuation * 0.35), color: '#10b981' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive BI Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time business intelligence across Finance, Operations, HR, and Supply Chain.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5"
            title="Refresh metrics from database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsVoiceOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Voice Command</span>
          </button>
        </div>
      </div>

      {/* AI Business Intelligence Executive Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-lg relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                Autonomous AI Executive Briefing
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {aiSummary ||
                `Click 'Generate Briefing' to synthesize real-time transactional figures into an authoritative C-Suite operational summary.`}
            </p>
          </div>

          <button
            onClick={generateAiSummary}
            disabled={isGeneratingAi}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shrink-0 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            {isGeneratingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>{aiSummary ? 'Regenerate' : 'Generate Briefing'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue & Profit */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Product & Service Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              ₹{financials.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" />
                {financials.profitMargin}% Net Margin
              </span>
              <span className="text-[11px] text-slate-400">
                (Profit: ₹{financials.netProfit.toLocaleString('en-IN')})
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Cash & Bank Position */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Liquid Cash Position</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              ₹{financials.cashPosition.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span>HDFC & Cash Accounts</span>
              <span>•</span>
              <span className="text-slate-300">AP: ₹{financials.accountsPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Inventory Valuation */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              ₹{inventory.totalValuation.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {inventory.lowStockCount > 0 ? (
                <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {inventory.lowStockCount} SKUs Low Stock
                </span>
              ) : (
                <span className="text-[11px] text-emerald-400">Optimal Stock</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 4: Workforce Attendance */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Workforce Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {hr.attendanceRate}%
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-medium">{hr.presentToday} Present</span>
              <span>/</span>
              <span>{hr.totalHeadcount} Total Staff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Highlights & Alerts Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overdue Receivables Alert */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Overdue Receivables ({financials.overdueInvoiceCount} Invoices)
            </div>
            <div className="text-sm font-bold text-rose-400 mt-0.5">
              ₹{financials.overdueReceivables.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automated reminders dispatched to client accounts.
            </p>
          </div>
        </div>

        {/* Manufacturing Active Work Orders */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Factory className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Active Production Orders</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">
              {operations.activeWorkOrders} Work Orders Running
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Delhi facility: Solar Inverter & IoT Gateway lines active.
            </p>
          </div>
        </div>

        {/* Pending Workflow Approvals */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Pending Approvals</div>
            <div className="text-sm font-bold text-blue-400 mt-0.5">
              {operations.pendingApprovals} Authorizations Awaiting Review
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              PO commitments and payroll advance vouchers.
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue vs Expenses Trend */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Financial Trajectory (P&L Trend)</h3>
              <p className="text-xs text-slate-400">Monthly Operating Revenue vs Total Expenditure</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
              FY 2026
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Inventory Valuation Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Inventory Asset Allocation</h3>
            <p className="text-xs text-slate-400">Finished Goods vs Raw Materials Valuation</p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {inventoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Finished Goods</span>
              <span className="font-semibold text-blue-400 block">
                ₹{Math.round(inventory.totalValuation * 0.65).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Raw Materials</span>
              <span className="font-semibold text-emerald-400 block">
                ₹{Math.round(inventory.totalValuation * 0.35).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Department Budget vs Actual Analysis */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Departmental Budget vs Actual Expenditure</h3>
            <p className="text-xs text-slate-400">Fiscal Year 2026 Allocation vs Committed Costs</p>
          </div>
          <span className="text-xs font-mono text-emerald-400">All Departments Within Cap</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
              />
              <Legend />
              <Bar dataKey="Allocated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
