/**
 * rbac.ts — Role-Based Access Control configuration & utilities
 * ===============================================================
 * Roles:
 *   - 'initiator'   : Can view global SFMS dashboard, Kaizen overview dashboard,
 *                     Log New Kaizen, Monthly Best Awards, End-to-End Flowchart,
 *                     and non-kaizen modules (5S, Red Flag, Safety, PPSR).
 *   - 'committee'   : Can view global SFMS dashboard, Kaizen overview dashboard,
 *                     Committee Review, Impact Point & Closure, Spreadsheet Register,
 *                     Monthly Best Awards, End-to-End Flowchart,
 *                     and non-kaizen modules. (CANNOT log new kaizen).
 *   - 'coordinator' : Kaizen Admin — full access to all kaizen tabs & all modules.
 *   - 'admin'       : Super Administrator — full access to everything.
 */

export type RoleCategory = 'initiator' | 'coordinator' | 'committee' | 'admin' | 'superadmin';

export type AppModule = 
  | 'global-dashboard' 
  | 'kaizen' 
  | 'redflag' 
  | 'fives' 
  | 'safety' 
  | 'ppsr' 
  | 'cft-awards';

export type KaizenSubTab = 
  | 'dashboard' 
  | 'form' 
  | 'drafts'
  | 'committee' 
  | 'list' 
  | 'cft-awards' 
  | 'impact-tracker' 
  | 'process-flowchart';

export type PpsrSubTab = 
  | 'initiate' 
  | 'drafts'
  | 'meeting' 
  | 'cft-awards' 
  | 'register';

/**
 * Access mapping for Kaizen subtabs per role category
 */
export const KAIZEN_TAB_PERMISSIONS: Record<KaizenSubTab, RoleCategory[]> = {
  // Kaizen Overview Dashboard is visible to ALL roles
  'dashboard': ['initiator', 'coordinator', 'committee', 'admin'],

  // Log New Kaizen: Initiator, Coordinator, Admin (Forbidden for Committee)
  'form': ['initiator', 'coordinator', 'admin'],

  // My Drafts: Initiator, Coordinator, Admin
  'drafts': ['initiator', 'coordinator', 'admin'],

  // Committee Review: Committee, Coordinator, Admin (Forbidden for Initiator)
  'committee': ['committee', 'coordinator', 'admin'],

  // Monthly Best Awards: Kaizen Coordinator & Super Admin ONLY (Forbidden for Initiator and Committee)
  'cft-awards': ['coordinator', 'admin', 'superadmin'],

  // Impact Point & Closure: Committee, Coordinator, Admin (Forbidden for Initiator)
  'impact-tracker': ['committee', 'coordinator', 'admin'],

  // End-to-End Flowchart: ALL roles
  'process-flowchart': ['initiator', 'coordinator', 'committee', 'admin'],

  // Spreadsheet Register: Committee, Coordinator, Admin (Forbidden for Initiator)
  'list': ['committee', 'coordinator', 'admin'],
};

/**
 * Access mapping for PPSR subtabs per role category
 * Rules:
 * - Initiator: Can only see and access filling form ('initiate')
 * - Committee: Can only see and access committee review ('meeting')
 * - Coordinator / Admin / Superadmin: Full access to all tabs
 */
export const PPSR_TAB_PERMISSIONS: Record<PpsrSubTab, RoleCategory[]> = {
  'initiate': ['initiator', 'coordinator', 'admin', 'superadmin'],
  'drafts': ['initiator', 'coordinator', 'admin', 'superadmin'],
  'meeting': ['committee', 'coordinator', 'admin', 'superadmin'],
  'cft-awards': ['coordinator', 'admin', 'superadmin'],
  'register': ['coordinator', 'admin', 'superadmin'],
};

/**
 * Access mapping for top-level modules
 */
export const MODULE_PERMISSIONS: Record<AppModule, RoleCategory[]> = {
  'global-dashboard': ['initiator', 'coordinator', 'committee', 'admin'],
  'kaizen': ['initiator', 'coordinator', 'committee', 'admin'],
  // Monthly Best Awards Module: Kaizen Coordinator & Super Admin ONLY
  'cft-awards': ['coordinator', 'admin', 'superadmin'],
  'redflag': ['initiator', 'coordinator', 'committee', 'admin'],
  'fives': ['initiator', 'coordinator', 'committee', 'admin'],
  'safety': ['initiator', 'coordinator', 'committee', 'admin'],
  'ppsr': ['initiator', 'coordinator', 'committee', 'admin'],
};

/**
 * Check if a role can access a specific PPSR sub-tab
 */
export function canAccessPpsrTab(
  role: RoleCategory = 'initiator',
  tab: PpsrSubTab
): boolean {
  if (role === 'admin' || role === 'coordinator' || role === 'superadmin') {
    return true;
  }
  const tabRoles = PPSR_TAB_PERMISSIONS[tab];
  return tabRoles ? tabRoles.includes(role) : false;
}

/**
 * Check if a role can access a specific module and optional subtab
 */
export function canAccessTab(
  role: RoleCategory = 'initiator',
  module: AppModule | string,
  tab?: KaizenSubTab | PpsrSubTab | string
): boolean {
  if (role === 'admin' || role === 'coordinator' || role === 'superadmin') {
    return true;
  }

  // Check top-level module access
  const moduleRoles = MODULE_PERMISSIONS[module as AppModule];
  if (moduleRoles && !moduleRoles.includes(role)) {
    return false;
  }

  // Check Kaizen sub-tab access
  if (module === 'kaizen' && tab) {
    const tabRoles = KAIZEN_TAB_PERMISSIONS[tab as KaizenSubTab];
    if (tabRoles && !tabRoles.includes(role)) {
      return false;
    }
  }

  // Check PPSR sub-tab access
  if (module === 'ppsr' && tab) {
    const tabRoles = PPSR_TAB_PERMISSIONS[tab as PpsrSubTab];
    if (tabRoles && !tabRoles.includes(role)) {
      return false;
    }
  }

  return true;
}

import type { AuthUser } from './auth';

/**
 * Resolve the user's role specifically for a target module.
 * - If user is superadmin -> 'superadmin'.
 * - If user has an assigned role for moduleCode in user.module_roles -> returns that role.
 * - Otherwise falls back to user.role_category (if assigned) or least-privilege 'initiator'.
 */
export function getUserModuleRole(
  user: AuthUser | null | undefined,
  moduleCode: string
): RoleCategory {
  if (!user) return 'initiator';
  if (
    user.is_superadmin ||
    user.role_category === 'superadmin' ||
    (user as any).isSuperadmin ||
    (user as any).roleCategory === 'superadmin'
  ) {
    return 'superadmin';
  }

  // Normalise module code (e.g. 'cft-awards' maps to 'kaizen')
  const targetCode = moduleCode === 'cft-awards' ? 'kaizen' : moduleCode;

  const rolesList: any[] = user.module_roles || (user as any).moduleRoles || [];
  if (Array.isArray(rolesList)) {
    const found = rolesList.find(
      (r: any) => (r.module_code === targetCode || r.moduleCode === targetCode)
    );
    if (found) {
      const rName = found.role_name || found.roleName;
      if (rName) {
        return rName as RoleCategory;
      }
    }
  }

  // Fallback to least privilege
  return 'initiator';
}

/**
 * Human readable label for role category
 */
export function getRoleBadge(
  role: RoleCategory = 'initiator',
  moduleName?: string
): {
  label: string;
  icon: string;
  colorClass: string;
  description: string;
} {
  const prefix = moduleName ? `${moduleName} ` : '';
  switch (role) {
    case 'initiator':
      return {
        label: moduleName ? `${prefix}Initiator` : 'Kaizen Initiator',
        icon: '👷',
        colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        description: 'Can log ideas & view dashboards and flowcharts',
      };
    case 'committee':
      return {
        label: moduleName ? `${prefix}Committee` : 'Committee Reviewer',
        icon: '👥',
        colorClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
        description: 'Can review items, track impact & manage register',
      };
    case 'coordinator':
      return {
        label: moduleName ? `${prefix}Coordinator` : 'Kaizen Coordinator',
        icon: '⚙️',
        colorClass: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
        description: 'Module Coordinator with full administrative control',
      };
    case 'admin':
      return {
        label: moduleName ? `${prefix}Admin` : 'System Admin',
        icon: '🛡️',
        colorClass: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
        description: 'Full master access across all modules and settings',
      };
    case 'superadmin':
      return {
        label: 'Super Administrator',
        icon: '👑',
        colorClass: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
        description: 'Global master access across all modules and settings',
      };
    default:
      return {
        label: moduleName ? `${prefix}Initiator` : 'Kaizen Initiator',
        icon: '👷',
        colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        description: 'Standard access',
      };
  }
}

// ─── MPS (Supply Chain / Weekly MRP) Role Definitions ────────────────────────
export type MpsRole = 'demand_planner' | 'supply_planner' | 'production' | 'management';

export interface MpsRoleDefinition {
  id: MpsRole;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  badgeBg: string;
  icon: string;
  color: string;
  hexColor: string;
  bg: string;
  border: string;
  text: string;
}

export const MPS_ROLE_DEFINITIONS: MpsRoleDefinition[] = [
  {
    id: 'demand_planner',
    label: 'Demand Planner',
    shortLabel: 'Demand',
    description: 'Configure monthly week calendars, upload monthly customer FG plans & review weekly prorated requirements.',
    colorClass: 'bg-blue-950/80 text-blue-300 border-blue-500/30',
    badgeBg: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
    icon: 'calendar_month',
    color: '#38bdf8',
    hexColor: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
    text: '#38bdf8',
  },
  {
    id: 'supply_planner',
    label: 'Supply / Buyer',
    shortLabel: 'Buyer',
    description: 'Maintain vendor-buyer mappings, review RM/PM gross requirements against stock, and track MB51 inward receipts.',
    colorClass: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    badgeBg: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
    icon: 'shopping_cart',
    color: '#818cf8',
    hexColor: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.15)',
    border: 'rgba(129, 140, 248, 0.35)',
    text: '#818cf8',
  },
  {
    id: 'production',
    label: 'Production & Shop Floor',
    shortLabel: 'Production',
    description: 'Monitor weekly FG plan vs actual 101 production receipts and track finished goods dispatches.',
    colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    badgeBg: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
    icon: 'precision_manufacturing',
    color: '#34d399',
    hexColor: '#34d399',
    bg: 'rgba(52, 211, 153, 0.15)',
    border: 'rgba(52, 211, 153, 0.35)',
    text: '#34d399',
  },
  {
    id: 'management',
    label: 'Plant Management',
    shortLabel: 'Management',
    description: 'Executive visibility into FG fulfillment, RM shortages by Buyer, and end-to-end supply chain health.',
    colorClass: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
    badgeBg: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
    icon: 'monitoring',
    color: '#fbbf24',
    hexColor: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.35)',
    text: '#fbbf24',
  },
];

export function getMpsRoleBadge(role?: string | null): {
  label: string;
  icon: string;
  colorClass: string;
  description: string;
  color: string;
  hexColor: string;
  bg: string;
  border: string;
  text: string;
} {
  const match = MPS_ROLE_DEFINITIONS.find((r) => r.id === role);
  if (match) {
    return {
      label: match.label,
      icon: match.icon,
      colorClass: match.badgeBg,
      description: match.description,
      color: match.color,
      hexColor: match.hexColor,
      bg: match.bg,
      border: match.border,
      text: match.text,
    };
  }
  if (role === 'superadmin') {
    return {
      label: 'Super Administrator',
      icon: 'admin_panel_settings',
      colorClass: 'bg-rose-600/20 text-rose-400 border border-rose-500/40',
      description: 'Global master access across all modules, plans and MPS',
      color: '#ef4444',
      hexColor: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.2)',
      border: 'rgba(239, 68, 68, 0.4)',
      text: '#f87171',
    };
  }
  return {
    label: 'No Access Assigned',
    icon: 'block',
    colorClass: 'bg-slate-800 text-slate-400 border border-slate-700',
    description: 'No role assigned for MPS module',
    color: '#94a3b8',
    hexColor: '#94a3b8',
    bg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#94a3b8',
  };
}

export function getUserMpsRole(user: AuthUser | null | undefined): MpsRole | 'superadmin' | 'none' {
  if (!user) return 'none';
  if (user.is_superadmin || user.role_category === 'superadmin' || (user as any).isSuperadmin) {
    return 'superadmin';
  }
  const rolesList: any[] = user.module_roles || (user as any).moduleRoles || [];
  if (Array.isArray(rolesList)) {
    const found = rolesList.find((r: any) => r.module_code === 'mps' || r.moduleCode === 'mps');
    if (found) {
      return (found.role_name || found.roleName) as MpsRole;
    }
  }
  return 'none';
}

// ─── Checklist Daily Work Management RBAC ─────────────────────────────
export type ChecklistRole = 'coordinator' | 'operator';

export interface ChecklistRoleDefinition {
  id: ChecklistRole;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  badgeBg: string;
  icon: string;
  color: string;
  hexColor: string;
  bg: string;
  border: string;
  text: string;
}

export const CHECKLIST_ROLE_DEFINITIONS: ChecklistRoleDefinition[] = [
  {
    id: 'coordinator',
    label: 'Coordinator',
    shortLabel: 'Coordinator',
    description: 'Full operational access to all Checklist tabs: Master Plant Portal, Plant Dashboard, Fill Checklist execution & Coordinator Administration.',
    colorClass: 'bg-violet-950/80 text-violet-300 border-violet-500/30',
    badgeBg: 'bg-violet-600/20 text-violet-400 border border-violet-500/30',
    icon: 'user_check',
    color: '#a855f7',
    hexColor: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.35)',
    text: '#c084fc',
  },
  {
    id: 'operator',
    label: 'Operator',
    shortLabel: 'Operator',
    description: 'Restricted execution access: authorized only to perform the Fill Checklist station verification and submit digital checkpoints.',
    colorClass: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    badgeBg: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
    icon: 'smartphone',
    color: '#f59e0b',
    hexColor: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#fbbf24',
  },
];

export function getChecklistRoleBadge(role?: string | null): {
  label: string;
  icon: string;
  colorClass: string;
  description: string;
  color: string;
  hexColor: string;
  bg: string;
  border: string;
  text: string;
} {
  const match = CHECKLIST_ROLE_DEFINITIONS.find((r) => r.id === role);
  if (match) {
    return {
      label: match.label,
      icon: match.icon,
      colorClass: match.badgeBg,
      description: match.description,
      color: match.color,
      hexColor: match.hexColor,
      bg: match.bg,
      border: match.border,
      text: match.text,
    };
  }
  if (role === 'superadmin') {
    return {
      label: 'Super Administrator',
      icon: 'admin_panel_settings',
      colorClass: 'bg-rose-600/20 text-rose-400 border border-rose-500/40',
      description: 'Global master root access across all Checklist tabs and platform',
      color: '#ef4444',
      hexColor: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.2)',
      border: 'rgba(239, 68, 68, 0.4)',
      text: '#f87171',
    };
  }
  return {
    label: 'No Access Assigned',
    icon: 'block',
    colorClass: 'bg-slate-800 text-slate-400 border border-slate-700',
    description: 'No role assigned for Checklist module',
    color: '#94a3b8',
    hexColor: '#94a3b8',
    bg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#94a3b8',
  };
}

export function getUserChecklistRole(user: AuthUser | null | undefined): ChecklistRole | 'superadmin' | 'none' {
  if (!user) return 'none';
  if (user.is_superadmin || user.role_category === 'superadmin' || (user as any).isSuperadmin) {
    return 'superadmin';
  }
  const rolesList: any[] = user.module_roles || (user as any).moduleRoles || [];
  if (Array.isArray(rolesList)) {
    const found = rolesList.find((r: any) => r.module_code === 'checklist' || r.moduleCode === 'checklist');
    if (found) {
      return (found.role_name || found.roleName) as ChecklistRole;
    }
  }
  // Fallback: If user's primary category is coordinator or admin, coordinator; else if initiator, operator
  if (user.role_category === 'coordinator' || user.role_category === 'admin') {
    return 'coordinator';
  }
  return 'operator';
}


