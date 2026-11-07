/**
 * types.ts — SuperAdmin TypeScript Interfaces
 * ============================================
 * Central types for the SuperAdmin dashboard, user management,
 * module scoping, audit logs, and KPI summary.
 */

export interface ModuleRoleItem {
  id?: number;
  module_code: string;
  moduleCode?: string;
  module_display?: string;
  moduleDisplay?: string;
  role_name: string;
  roleName?: string;
  role_display?: string;
  roleDisplay?: string;
  mini_factory: string;
  miniFactory?: string;
  mini_factory_display?: string;
  miniFactoryDisplay?: string;
  assigned_at?: string;
  assignedAt?: string;
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  phone?: string;
  employee_id: string;
  employeeId?: string;
  full_name: string;
  fullName?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  department: string;
  designation: string;
  plant: string;
  area?: string;
  mini_factory: string;
  miniFactory?: string;
  role?: number;
  role_detail?: {
    id: number;
    name: string;
    description?: string;
    permissions?: Record<string, boolean>;
  };
  roleDetail?: {
    id: number;
    name: string;
    description?: string;
    permissions?: Record<string, boolean>;
  };
  role_name: string;
  roleName?: string;
  role_category: string;
  roleCategory?: string;
  is_superadmin: boolean;
  isSuperadmin?: boolean;
  is_active_employee: boolean;
  isActiveEmployee?: boolean;
  must_change_password: boolean;
  mustChangePassword?: boolean;
  module_roles: ModuleRoleItem[];
  moduleRoles?: ModuleRoleItem[];
  last_login?: string | null;
  lastLogin?: string | null;
  date_joined?: string;
  dateJoined?: string;
  last_activity?: string | null;
  lastActivity?: string | null;
}

export interface SummaryKPI {
  total_users: number;
  totalUsers?: number;
  active_users: number;
  activeUsers?: number;
  disabled_users: number;
  disabledUsers?: number;
  must_change_password_count: number;
  mustChangePasswordCount?: number;
  superadmin_count?: number;
  superadminCount?: number;
}

export interface SummarySecurity {
  active_redis_sessions: number;
  activeRedisSessions?: number;
  recent_audit_events_24h: number;
  recentAuditEvents24h?: number;
  system_mfa_enforced: boolean;
  systemMfaEnforced?: boolean;
  platform_status: string;
  platformStatus?: string;
  auth_mode: string;
  authMode?: string;
}

export interface SummaryData {
  kpi: SummaryKPI;
  mini_factory_distribution: Record<string, number>;
  miniFactoryDistribution?: Record<string, number>;
  module_roles_summary: Record<string, Record<string, number>>;
  moduleRolesSummary?: Record<string, Record<string, number>>;
  security: SummarySecurity;
}

export interface AuditLogRow {
  id: number;
  user: number | null;
  user_name: string;
  userName?: string;
  target_user: number | null;
  target_user_name: string | null;
  targetUserName?: string | null;
  action: string;
  action_display: string;
  actionDisplay?: string;
  previous_value: string;
  previousValue?: string;
  new_value: string;
  newValue?: string;
  timestamp: string;
  remarks: string;
  ip_address: string | null;
  ipAddress?: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RbacMetadata {
  modules: string[];
  module_roles_map: Record<string, string[]>;
  moduleRolesMap?: Record<string, string[]>;
  mini_factories: string[];
  miniFactories?: string[];
  system_roles: Array<{ name: string; label: string }>;
  systemRoles?: Array<{ name: string; label: string }>;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

