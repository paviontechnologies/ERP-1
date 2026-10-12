'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_USERS } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  Search,
  Bell,
  Mic,
  Building2,
  ChevronDown,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { role, setRole, currentUser, setIsVoiceOpen } = useAuth();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Left: Organization & Branch Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">Apex Global Industries Ltd.</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-400">Mumbai Corporate HQ</span>
        </div>
      </div>

      {/* Right Controls: Role Switcher, Voice Assistant, Approvals */}
      <div className="flex items-center gap-3">
        {/* Quick Voice Assistant Mic Button */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
          title="Open AI Voice Assistant"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          <span>Ask Voice AI</span>
        </button>

        {/* Pending Approvals Link */}
        <Link
          href="/approvals"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Pending Approvals"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
        </Link>

        {/* Role Switcher Dropdown (Demo Multi-Role Simulator) */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
              {currentUser.name[0]}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold block leading-tight text-white">{currentUser.name}</span>
              <span className="text-[10px] text-blue-400 font-mono block leading-tight">{role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Switch Active Role (RBAC Demo)
                </span>
                <span className="text-[11px] text-slate-400">
                  Select a persona to test permissions and voice queries:
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-800/50">
                {Object.keys(DEMO_USERS).map((key) => {
                  const r = key as UserRole;
                  const u = DEMO_USERS[r];
                  const isCurrent = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                        isCurrent ? 'bg-blue-600/10 text-blue-400' : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.title} ({r})</div>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
