'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LifeBuoy,
  RefreshCw,
  Send,
} from 'lucide-react';

export default function ProjectsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks' | 'tickets'>('projects');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setData({ projects: [], tasks: [], tickets: [] });
      }
    } catch (err) {
      console.error(err);
      setData({ projects: [], tasks: [], tickets: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const { projects, tasks, tickets } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Project Management & Customer Support</h1>
        <p className="text-xs text-slate-400 mt-1">
          Project-to-Billing workflow: Engineering milestones, tasks, billable hours, and SLA support tickets.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'projects' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Engineering Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'tasks' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Project Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'tickets' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Customer Support Tickets ({tickets.length})
        </button>
      </div>

      {/* Tab 1: Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projects.map((p: any) => (
            <div key={p.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-400">{p.code}</span>
                  <h3 className="text-base font-semibold text-white">{p.name}</h3>
                  <span className="text-xs text-slate-400">Client: {p.customer?.name || 'Internal Delivery'}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-max">
                  {p.status}
                </span>
              </div>

              <p className="text-xs text-slate-300">{p.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Allocated Budget</span>
                  <span className="font-bold text-white">₹{p.budget.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Actual Spent</span>
                  <span className="font-bold text-rose-400">₹{p.spentCost.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Billing Structure</span>
                  <span className="font-mono text-slate-300">{p.billingType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tasks Count</span>
                  <span className="font-bold text-blue-400">{p.tasks.length} Active Tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Task Title</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">Hours Logged</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {tasks.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{t.title}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{t.project?.code}</td>
                    <td className="px-4 py-3 text-slate-400">{t.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {t.actualHours} / {t.estimatedHours} hrs
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {tickets.map((tc: any) => (
            <div key={tc.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{tc.ticketNumber}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {tc.category}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {tc.status}
                </span>
              </div>
              <h4 className="font-semibold text-white text-sm">{tc.subject}</h4>
              <p className="text-xs text-slate-400">{tc.description}</p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                <span>Customer: <strong className="text-white">{tc.customer?.name}</strong></span>
                <span>Assigned: <strong className="text-slate-300">{tc.assignedTo?.name || 'Support Queue'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
