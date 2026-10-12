'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { DEMO_USERS } from '@/lib/auth';

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: typeof DEMO_USERS[UserRole];
  isVoiceOpen: boolean;
  setIsVoiceOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('CEO');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('apex_user_role') as UserRole;
    if (saved && DEMO_USERS[saved]) {
      setRoleState(saved);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('apex_user_role', newRole);
  };

  const currentUser = DEMO_USERS[role] || DEMO_USERS.CEO;

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        isVoiceOpen,
        setIsVoiceOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
