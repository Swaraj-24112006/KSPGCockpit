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
 * Check if a role can access a specific module and optional subtab
 */
export function canAccessTab(
  role: RoleCategory = 'initiator',
  module: AppModule | string,
  tab?: KaizenSubTab | string
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

  return true;
}

/**
 * Human readable label for role category
 */
export function getRoleBadge(role: RoleCategory = 'initiator'): {
  label: string;
  icon: string;
  colorClass: string;
  description: string;
} {
  switch (role) {
    case 'initiator':
      return {
        label: 'Kaizen Initiator',
        icon: '👷',
        colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        description: 'Can log kaizens & view dashboards, flowchart and monthly awards',
      };
    case 'committee':
      return {
        label: 'Committee Reviewer',
        icon: '👥',
        colorClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
        description: 'Can review kaizens, track impact & manage spreadsheet register',
      };
    case 'coordinator':
      return {
        label: 'Kaizen Coordinator',
        icon: '⚙️',
        colorClass: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
        description: 'Kaizen Administrator with full system control',
      };
    case 'admin':
      return {
        label: 'System Admin',
        icon: '👑',
        colorClass: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
        description: 'Full master access across all modules and settings',
      };
    default:
      return {
        label: 'Kaizen Initiator',
        icon: '👷',
        colorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
        description: 'Standard access',
      };
  }
}
