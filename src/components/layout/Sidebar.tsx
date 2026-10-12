'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Factory,
  Landmark,
  Users2,
  FolderKanban,
  CheckSquare,
  ShieldAlert,
  Mic,
  Cpu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { setIsVoiceOpen } = useAuth();

  const navigation = [
    { name: 'Executive BI', href: '/', icon: LayoutDashboard },
    { name: 'Sales & CRM', href: '/sales', icon: ShoppingCart },
    { name: 'Inventory & Stock', href: '/inventory', icon: Boxes },
    { name: 'Procurement & SCM', href: '/procurement', icon: Truck },
    { name: 'Manufacturing (BOM)', href: '/manufacturing', icon: Factory },
    { name: 'Finance & Ledger', href: '/finance', icon: Landmark },
    { name: 'HRMS & Payroll', href: '/hrms', icon: Users2 },
    { name: 'Projects & Tasks', href: '/projects', icon: FolderKanban },
    { name: 'Approval Inbox', href: '/approvals', icon: CheckSquare },
    { name: 'Audit Trails', href: '/audit', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight">APEX GLOBAL</h1>
            <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">AI Voice ERP</span>
          </div>
        </div>

        {/* AI Voice Trigger Banner */}
        <div className="p-3">
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 hover:from-blue-600/30 hover:via-indigo-600/30 hover:to-purple-600/30 border border-blue-500/30 text-white transition-all group shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Mic className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold block text-slate-100">AI Voice Assistant</span>
                <span className="text-[10px] text-slate-400 block">Hindi • English • Hinglish</span>
              </div>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30 font-mono">
              Space
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>PostgreSQL v18</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Connected
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Multi-Company Single Source of Truth</p>
      </div>
    </aside>
  );
}
