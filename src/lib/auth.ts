import { UserRole } from '@prisma/client';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  branchId?: string;
  departmentId?: string;
}

// 10 Standard Enterprise Demo Users
export const DEMO_USERS: Record<UserRole, { email: string; name: string; role: UserRole; title: string }> = {
  SUPER_ADMIN: {
    email: 'admin@apex.com',
    name: 'Vikram Sharma',
    role: UserRole.SUPER_ADMIN,
    title: 'Managing Director & CIO',
  },
  CEO: {
    email: 'ceo@apex.com',
    name: 'Rajesh Singhania',
    role: UserRole.CEO,
    title: 'Chief Executive Officer',
  },
  FINANCE_MANAGER: {
    email: 'finance@apex.com',
    name: 'Ananya Iyer',
    role: UserRole.FINANCE_MANAGER,
    title: 'Chief Financial Officer',
  },
  HR_MANAGER: {
    email: 'hr@apex.com',
    name: 'Priya Nair',
    role: UserRole.HR_MANAGER,
    title: 'Head of People Operations',
  },
  SALES_MANAGER: {
    email: 'sales@apex.com',
    name: 'Rohan Verma',
    role: UserRole.SALES_MANAGER,
    title: 'VP - Enterprise Sales',
  },
  PROCUREMENT_MANAGER: {
    email: 'procurement@apex.com',
    name: 'Suresh Patel',
    role: UserRole.PROCUREMENT_MANAGER,
    title: 'Director - Supply Chain & Procurement',
  },
  INVENTORY_MANAGER: {
    email: 'inventory@apex.com',
    name: 'Manoj Kumar',
    role: UserRole.INVENTORY_MANAGER,
    title: 'Warehouse Operations Manager',
  },
  PRODUCTION_MANAGER: {
    email: 'production@apex.com',
    name: 'Arvind Deshmukh',
    role: UserRole.PRODUCTION_MANAGER,
    title: 'Plant Operations Head',
  },
  PROJECT_MANAGER: {
    email: 'projects@apex.com',
    name: 'Neha Gupta',
    role: UserRole.PROJECT_MANAGER,
    title: 'Senior Technical Program Manager',
  },
  EMPLOYEE: {
    email: 'employee@apex.com',
    name: 'Rahul Joshi',
    role: UserRole.EMPLOYEE,
    title: 'Key Account Executive',
  },
};

// Granular RBAC Permissions
export type Permission =
  | 'view:finance'
  | 'manage:finance'
  | 'view:hr'
  | 'manage:hr'
  | 'view:sales'
  | 'manage:sales'
  | 'view:inventory'
  | 'manage:inventory'
  | 'view:procurement'
  | 'manage:procurement'
  | 'view:manufacturing'
  | 'manage:manufacturing'
  | 'view:projects'
  | 'manage:projects'
  | 'view:analytics'
  | 'approve:all'
  | 'view:audit';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'view:finance', 'manage:finance',
    'view:hr', 'manage:hr',
    'view:sales', 'manage:sales',
    'view:inventory', 'manage:inventory',
    'view:procurement', 'manage:procurement',
    'view:manufacturing', 'manage:manufacturing',
    'view:projects', 'manage:projects',
    'view:analytics', 'approve:all', 'view:audit',
  ],
  CEO: [
    'view:finance', 'manage:finance',
    'view:hr', 'manage:hr',
    'view:sales', 'manage:sales',
    'view:inventory', 'manage:inventory',
    'view:procurement', 'manage:procurement',
    'view:manufacturing', 'manage:manufacturing',
    'view:projects', 'manage:projects',
    'view:analytics', 'approve:all', 'view:audit',
  ],
  FINANCE_MANAGER: [
    'view:finance', 'manage:finance',
    'view:sales',
    'view:procurement',
    'view:inventory',
    'view:analytics',
    'view:audit',
  ],
  HR_MANAGER: [
    'view:hr', 'manage:hr',
    'view:analytics',
  ],
  SALES_MANAGER: [
    'view:sales', 'manage:sales',
    'view:inventory',
    'view:analytics',
  ],
  PROCUREMENT_MANAGER: [
    'view:procurement', 'manage:procurement',
    'view:inventory',
    'view:finance',
    'view:analytics',
  ],
  INVENTORY_MANAGER: [
    'view:inventory', 'manage:inventory',
    'view:procurement',
    'view:manufacturing',
    'view:analytics',
  ],
  PRODUCTION_MANAGER: [
    'view:manufacturing', 'manage:manufacturing',
    'view:inventory',
    'view:analytics',
  ],
  PROJECT_MANAGER: [
    'view:projects', 'manage:projects',
    'view:sales',
    'view:analytics',
  ],
  EMPLOYEE: [
    'view:sales',
    'view:projects',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission) || perms.includes('approve:all');
}
