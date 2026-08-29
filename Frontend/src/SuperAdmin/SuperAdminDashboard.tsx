import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser, authFetch } from '../shared/utils/auth';

interface SuperAdminDashboardProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  onNavigateToCockpit: () => void;
  onNavigateToSfc: () => void;
}

interface SummaryData {
  kpi: {
    total_users: number;
    active_users: number;
    disabled_users: number;
    must_change_password_count: number;
  };
  mini_factory_distribution: Record<string, number>;
  module_roles_summary: Record<string, Record<string, number>>;
  security: {
    active_redis_sessions: number;
    recent_audit_events_24h: number;
    system_mfa_enforced: boolean;
    platform_status: string;
    auth_mode: string;
  };
}

interface ModuleRoleItem {
  id?: number;
  module_code: string;
  module_display?: string;
  role_name: string;
  role_display?: string;
  mini_factory: string;
  mini_factory_display?: string;
  assigned_at?: string;
}

interface UserRow {
  id: number;
  username: string;
  email: string;
  phone?: string;
  employee_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  department: string;
  designation: string;
  plant: string;
  area?: string;
  mini_factory: string;
  role?: number;
  role_name: string;
  role_category: string;
  is_superadmin: boolean;
  is_active_employee: boolean;
  must_change_password: boolean;
  module_roles: ModuleRoleItem[];
  last_login?: string;
  date_joined?: string;
}

interface AuditLogRow {
  id: number;
  user: number | null;
  user_name: string;
  target_user: number | null;
  target_user_name: string | null;
  action: string;
  action_display: string;
  previous_value: string;
  new_value: string;
  timestamp: string;
  remarks: string;
  ip_address: string | null;
}

export default function SuperAdminDashboard({
  currentUser,
  onLogout,
  onNavigateToCockpit,
  onNavigateToSfc,
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit'>('users');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // User Management State
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMiniFactory, setFilterMiniFactory] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterModule, setFilterModule] = useState('ALL');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showMiniFactoryModal, setShowMiniFactoryModal] = useState(false);
  const [selectedUserForMiniFactory, setSelectedUserForMiniFactory] = useState<UserRow | null>(null);
  const [newMiniFactoryScope, setNewMiniFactoryScope] = useState('MF1');
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState<UserRow | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [tempPasswordSuccess, setTempPasswordSuccess] = useState<{ username: string; tempPass: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [totalAuditCount, setTotalAuditCount] = useState(0);

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    username: '',
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: 'Production',
    designation: 'Process Operator',
    mini_factory: 'MF1',
    plant: 'Pune Plant 1',
    role: 'initiator',
    kaizen_role: 'initiator',
    temporary_password: '',
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    mini_factory: 'MF1',
    role: 'initiator',
  });

  // Module Role Assign State
  const [moduleAssignForm, setModuleAssignForm] = useState({
    module_code: 'kaizen',
    role_name: 'coordinator',
    mini_factory: 'MF1',
  });

  // Fetch KPI Summary
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await authFetch('/api/v1/auth/superadmin/summary/');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSummary(json.data);
      }
    } catch (e) {
      console.error('Error fetching summary:', e);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (filterMiniFactory !== 'ALL') params.set('mini_factory', filterMiniFactory);
      if (filterRole !== 'ALL') params.set('role', filterRole);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterModule !== 'ALL') params.set('module', filterModule);

      const res = await authFetch(`/api/v1/auth/superadmin/users/?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.results) {
          setUsers(json.results);
          setTotalUsersCount(json.count || json.results.length);
        } else if (json.data) {
          setUsers(json.data);
          setTotalUsersCount(json.data.length);
        }
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, [page, pageSize, searchQuery, filterMiniFactory, filterRole, filterStatus, filterModule]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(auditPage));
      params.set('page_size', '15');
      if (auditActionFilter !== 'ALL') params.set('action', auditActionFilter);
      if (auditSearchQuery.trim()) params.set('search', auditSearchQuery.trim());

      const res = await authFetch(`/api/v1/auth/superadmin/audit-logs/?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.results) {
          setAuditLogs(json.results);
          setTotalAuditCount(json.count || json.results.length);
        }
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  }, [auditPage, auditActionFilter, auditSearchQuery]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchUsers, fetchAuditLogs]);

  // User Actions
  const openStatusConfirmModal = (user: UserRow) => {
    if (user.id === currentUser?.id) {
      alert('You cannot disable your own SuperAdmin account.');
      return;
    }
    setUserToToggleStatus(user);
    setShowStatusConfirmModal(true);
  };

  const confirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    setStatusActionLoading(true);
    try {
      const res = await authFetch(`/api/v1/auth/superadmin/users/${userToToggleStatus.id}/toggle-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowStatusConfirmModal(false);
        if (selectedUser?.id === userToToggleStatus.id && json.data) {
          setSelectedUser(json.data);
        }
        setUserToToggleStatus(null);
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to update user status.');
      }
    } catch {
      alert('Error updating user status.');
    } finally {
      setStatusActionLoading(false);
    }
  };

  const openMiniFactoryModal = (user: UserRow) => {
    setSelectedUserForMiniFactory(user);
    setNewMiniFactoryScope(user.mini_factory || 'MF1');
    setShowMiniFactoryModal(true);
  };

  const handleMiniFactoryChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForMiniFactory) return;
    try {
      const res = await authFetch(`/api/v1/auth/superadmin/users/${selectedUserForMiniFactory.id}/change-mini-factory/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mini_factory: newMiniFactoryScope }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowMiniFactoryModal(false);
        if (selectedUser?.id === selectedUserForMiniFactory.id && json.data) {
          setSelectedUser(json.data);
        }
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to update Mini-Factory scope.');
      }
    } catch {
      alert('Error updating Mini-Factory scope.');
    }
  };

  const handleResetTempPassword = async (user: UserRow) => {
    if (!window.confirm(`Issue temporary password reset for ${user.username}? Active sessions will be terminated.`)) return;

    try {
      const res = await authFetch(`/api/v1/auth/superadmin/users/${user.id}/reset-temp-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTempPasswordSuccess({ username: user.username, tempPass: json.temporary_password });
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to reset password.');
      }
    } catch {
      alert('Error resetting temporary password.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/v1/auth/superadmin/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowCreateModal(false);
        setTempPasswordSuccess({ username: createForm.username, tempPass: json.temporary_password });
        setCreateForm({
          username: '',
          employee_id: '',
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          department: 'Production',
          designation: 'Process Operator',
          mini_factory: 'MF1',
          plant: 'Pune Plant 1',
          role: 'initiator',
          kaizen_role: 'initiator',
          temporary_password: '',
        });
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to create user in database.');
      }
    } catch {
      alert('Error creating user account.');
    }
  };

  const handleDeleteUser = async (user: UserRow) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own SuperAdmin account.');
      return;
    }
    const confirmMsg = `Are you sure you want to permanently delete ${user.username} (${user.employee_id})? This action will remove the user from the database and invalidate all active sessions.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await authFetch(`/api/v1/auth/superadmin/users/${user.id}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (selectedUser?.id === user.id) {
          setShowDetailDrawer(false);
          setSelectedUser(null);
        }
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to delete user.');
      }
    } catch {
      alert('Error deleting user account.');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await authFetch(`/api/v1/auth/superadmin/users/${selectedUser.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowEditModal(false);
        if (json.data) {
          setSelectedUser(json.data);
        }
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to update user.');
      }
    } catch {
      alert('Error updating user.');
    }
  };

  const handleAssignModuleRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await authFetch(`/api/v1/auth/superadmin/users/${selectedUser.id}/assign-module-role/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleAssignForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowRoleModal(false);
        if (json.data) {
          setSelectedUser(json.data);
        }
        fetchUsers();
        fetchSummary();
      } else {
        alert(json?.error?.message || 'Failed to assign module role.');
      }
    } catch {
      alert('Error assigning module role.');
    }
  };

  const openEditModal = (user: UserRow) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      mini_factory: user.mini_factory || 'MF1',
      role: user.role_category === 'superadmin' ? 'superadmin' : (user.role_name || 'initiator'),
    });
    setShowEditModal(true);
  };

  const openRoleModal = (user: UserRow) => {
    setSelectedUser(user);
    const kaizenRole = (user.module_roles || []).find((r) => r.module_code === 'kaizen');
    setModuleAssignForm({
      module_code: 'kaizen',
      role_name: kaizenRole?.role_name || 'initiator',
      mini_factory: kaizenRole?.mini_factory || user.mini_factory || 'MF1',
    });
    setShowRoleModal(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f1d',
        color: '#f8fafc',
        fontFamily: "'Hanken Grotesk', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          height: '70px',
          backgroundColor: '#0d1527',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ffffff' }}>
              admin_panel_settings
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', color: '#ffffff' }}>
                KSPG SUPERADMIN GOVERNANCE
              </h1>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                LEVEL 0 PLATFORM ROOT
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Multi-Module Identity, Mini-Factory Authorization & Session Governance
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.75rem',
              color: '#34d399',
              fontWeight: 600,
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            SESSION MESH ACTIVE
          </div>

          <button
            onClick={onNavigateToCockpit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              space_dashboard
            </span>
            Operations Cockpit
          </button>

          <button
            onClick={onNavigateToSfc}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              bolt
            </span>
            Kaizen SFC
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              paddingLeft: '1rem',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                {currentUser?.full_name || currentUser?.username}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>SuperAdmin Root</div>
            </div>
            <button
              onClick={onLogout}
              title="Logout Session"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1600px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Executive Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Card 1: Users */}
          <div
            style={{
              backgroundColor: '#11192e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Platform Users
              </span>
              <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '20px' }}>
                group
              </span>
            </div>
            <div style={{ margin: '0.75rem 0' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                {loadingSummary ? '...' : summary?.kpi?.total_users ?? 0}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem' }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>🟢 {summary?.kpi?.active_users ?? 0} Active</span>
              <span style={{ color: '#f87171', fontWeight: 600 }}>🔴 {summary?.kpi?.disabled_users ?? 0} Disabled</span>
            </div>
          </div>

          {/* Card 2: Mini-Factories */}
          <div
            style={{
              backgroundColor: '#11192e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mini-Factory Distribution
              </span>
              <span className="material-symbols-outlined" style={{ color: '#a855f7', fontSize: '20px' }}>
                factory
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
              {['MF1', 'MF2', 'MF3', 'Central'].map((mf) => (
                <div
                  key={mf}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.75rem',
                    color: '#e2e8f0',
                  }}
                >
                  <strong>{mf}:</strong> {summary?.mini_factory_distribution?.[mf] ?? 0}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>All users assigned to isolated factory scopes</div>
          </div>

          {/* Card 3: Modules */}
          <div
            style={{
              backgroundColor: '#11192e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Module Role Coverage
              </span>
              <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '20px' }}>
                extension
              </span>
            </div>
            <div style={{ margin: '0.75rem 0', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                Kaizen (Active)
              </span>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.75rem' }}>
                5S
              </span>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.75rem' }}>
                PPSR
              </span>
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.75rem' }}>
                Safety
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Kaizen: {summary?.module_roles_summary?.kaizen?.coordinator ?? 0} Coords, {summary?.module_roles_summary?.kaizen?.committee ?? 0} Committee
            </div>
          </div>

          {/* Card 4: Security */}
          <div
            style={{
              backgroundColor: '#11192e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Security & Session Mesh
              </span>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px' }}>
                shield_with_heart
              </span>
            </div>
            <div style={{ margin: '0.75rem 0' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                {summary?.security?.active_redis_sessions ?? 0} Redis Sessions
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                {summary?.security?.recent_audit_events_24h ?? 0} Audit entries in last 24h
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
              ✓ Immediate Session Revocation on Disable
            </div>
          </div>
        </div>

        {/* Temporary Password Success Notification */}
        {tempPasswordSuccess && (
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '0.75rem',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#60a5fa', fontSize: '24px' }}>
                key
              </span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  Temporary Password Generated for {tempPasswordSuccess.username}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                  Temporary Password:{' '}
                  <code style={{ background: '#0a0f1d', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8', fontWeight: 700 }}>
                    {tempPasswordSuccess.tempPass}
                  </code>{' '}
                  (User must change this on first login)
                </div>
              </div>
            </div>
            <button
              onClick={() => setTempPasswordSuccess(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '1.5rem',
          }}
        >
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'users' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'users' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              table_chart
            </span>
            User Management ({totalUsersCount})
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'roles' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'roles' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'roles' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              admin_panel_settings
            </span>
            Role Matrix & Scopes
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'audit' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'audit' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'audit' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              history
            </span>
            Audit Logs & Security Trail
          </button>
        </div>

        {/* ── Tab 1: User Management ───────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div>
            {/* Filter and Action Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                backgroundColor: '#11192e',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }}
                  >
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, ID, username..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.8rem 0.55rem 2.2rem',
                      borderRadius: '0.5rem',
                      background: '#0a0f1d',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Mini-Factory Filter */}
                <select
                  value={filterMiniFactory}
                  onChange={(e) => {
                    setFilterMiniFactory(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">🏭 All Mini-Factories</option>
                  <option value="MF1">MF1 (Mini-Factory 1)</option>
                  <option value="MF2">MF2 (Mini-Factory 2)</option>
                  <option value="MF3">MF3 (Mini-Factory 3)</option>
                  <option value="Central">Central / Shared</option>
                </select>

                {/* Role Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">👤 All Roles</option>
                  <option value="superadmin">Super Administrator</option>
                  <option value="kaizen_lead">Coordinator / Lead</option>
                  <option value="reviewer">Committee Member</option>
                  <option value="initiator">Initiator</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">⚡ All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>

                {/* Module Filter */}
                <select
                  value={filterModule}
                  onChange={(e) => {
                    setFilterModule(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">🧩 All Modules</option>
                  <option value="kaizen">Kaizen Module</option>
                  <option value="fives">5S Module</option>
                  <option value="ppsr">PPSR Module</option>
                  <option value="safety_desk">Safety Desk</option>
                </select>

                {/* Clear Filters CTA */}
                {(searchQuery || filterMiniFactory !== 'ALL' || filterRole !== 'ALL' || filterStatus !== 'ALL' || filterModule !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterMiniFactory('ALL');
                      setFilterRole('ALL');
                      setFilterStatus('ALL');
                      setFilterModule('ALL');
                      setPage(1);
                    }}
                    style={{
                      padding: '0.55rem 0.85rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Clear all search and filter conditions to restore full user list"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt_off</span>
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Add User CTA */}
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  person_add
                </span>
                Add New User
              </button>
            </div>

            {/* Excel-Style User Data Grid */}
            <div
              style={{
                backgroundColor: '#11192e',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#0d1527',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.72rem',
                      }}
                    >
                      <th style={{ padding: '0.9rem 1rem' }}>User / Identity</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Emp ID</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Department</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Mini-Factory</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Primary Role</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Kaizen Scope</th>
                      <th style={{ padding: '0.9rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                          Loading user directory...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                          No users matched the current search and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const kaizenRole = u.module_roles?.find((r) => r.module_code === 'kaizen');
                        const isSuper = u.is_superadmin || u.role_category === 'superadmin';

                        return (
                          <tr
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setShowDetailDrawer(true);
                            }}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              backgroundColor: u.is_active_employee ? 'transparent' : 'rgba(239, 68, 68, 0.03)',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = u.is_active_employee ? 'transparent' : 'rgba(239, 68, 68, 0.03)';
                            }}
                          >
                            {/* User column */}
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    backgroundColor: isSuper ? '#ef4444' : '#1e293b',
                                    border: isSuper ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {u.first_name ? u.first_name[0].toUpperCase() : u.username[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.full_name || u.username}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    @{u.username} • {u.email || 'no email'}
                                    {u.phone ? ` • 📞 ${u.phone}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Emp ID */}
                            <td style={{ padding: '0.8rem 1rem', fontFamily: "'JetBrains Mono', monospace", color: '#cbd5e1' }}>
                              {u.employee_id}
                            </td>

                            {/* Department */}
                            <td style={{ padding: '0.8rem 1rem', color: '#94a3b8' }}>
                              <div>{u.department || '—'}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{u.designation}</div>
                            </td>

                            {/* Mini-Factory */}
                            <td style={{ padding: '0.8rem 1rem' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  color: '#38bdf8',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {u.mini_factory || 'MF1'}
                              </span>
                            </td>

                            {/* Primary Role */}
                            <td style={{ padding: '0.8rem 1rem' }}>
                              {isSuper ? (
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', fontWeight: 800, fontSize: '0.72rem' }}>
                                  SUPERADMIN
                                </span>
                              ) : u.role_category === 'coordinator' ? (
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontWeight: 700, fontSize: '0.72rem' }}>
                                  COORDINATOR
                                </span>
                              ) : u.role_category === 'committee' ? (
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontWeight: 700, fontSize: '0.72rem' }}>
                                  COMMITTEE
                                </span>
                              ) : (
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.72rem' }}>
                                  INITIATOR
                                </span>
                              )}
                            </td>

                            {/* Kaizen Scope */}
                            <td style={{ padding: '0.8rem 1rem' }}>
                              {kaizenRole ? (
                                <div style={{ fontSize: '0.75rem' }}>
                                  <strong style={{ color: '#f8fafc' }}>{kaizenRole.role_name.toUpperCase()}</strong>
                                  <span style={{ color: '#64748b' }}> ({kaizenRole.mini_factory})</span>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Default (MF1)</span>
                              )}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.8rem 1rem' }}>
                              {u.is_active_employee ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontWeight: 700, fontSize: '0.75rem' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                                  ACTIVE
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f87171', fontWeight: 700, fontSize: '0.75rem' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                  DISABLED
                                </span>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                                {/* Detail Drawer */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(u);
                                    setShowDetailDrawer(true);
                                  }}
                                  title="View User Details & Access Information"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                                </button>

                                {/* Change Mini-Factory */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMiniFactoryModal(u);
                                  }}
                                  title="Change User's Mini-Factory Scope"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>factory</span>
                                </button>

                                {/* Module Role Scoping */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRoleModal(u);
                                  }}
                                  title="Change Module Role"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: 'rgba(168, 85, 247, 0.1)',
                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                    color: '#c084fc',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>badge</span>
                                </button>

                                {/* Edit User Profile */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(u);
                                  }}
                                  title="Edit User Profile"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                </button>

                                {/* Temp Password Reset */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetTempPassword(u);
                                  }}
                                  title="Reset Temporary Password & Revoke Sessions"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    border: '1px solid rgba(251, 191, 36, 0.25)',
                                    color: '#fbbf24',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>key</span>
                                </button>

                                {/* Toggle Disable / Enable */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openStatusConfirmModal(u);
                                  }}
                                  disabled={u.id === currentUser?.id}
                                  title={u.is_active_employee ? "Disable User & Revoke Sessions" : "Re-enable User Account"}
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: u.is_active_employee ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    border: u.is_active_employee ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                                    color: u.is_active_employee ? '#f87171' : '#34d399',
                                    cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                                    opacity: u.id === currentUser?.id ? 0.3 : 1,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                    {u.is_active_employee ? 'block' : 'check_circle'}
                                  </span>
                                </button>

                                {/* Delete User */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(u);
                                  }}
                                  disabled={u.id === currentUser?.id}
                                  title="Permanently Delete User"
                                  style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                                    opacity: u.id === currentUser?.id ? 0.3 : 1,
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-side Pagination Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.9rem 1.25rem',
                  backgroundColor: '#0d1527',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                }}
              >
                <div>
                  Showing {users.length} of {totalUsersCount} registered platform users
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: page <= 1 ? '#475569' : '#ffffff',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>Page {page}</span>
                  <button
                    disabled={page * pageSize >= totalUsersCount}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: page * pageSize >= totalUsersCount ? '#475569' : '#ffffff',
                      cursor: page * pageSize >= totalUsersCount ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Role Matrix & Scopes ──────────────────────────────────── */}
        {activeTab === 'roles' && (
          <div style={{ backgroundColor: '#11192e', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              Extensible Module RBAC & Mini-Factory Scoping Model
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '2rem' }}>
              Permissions are derived strictly from backend state. Each user has <strong>exactly one role per active module</strong> (Kaizen, 5S, PPSR, Safety Desk), scoped to their designated Mini-Factory.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* SuperAdmin Card */}
              <div style={{ backgroundColor: '#0d1527', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>admin_panel_settings</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>SuperAdmin (Platform Root)</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  Platform-wide user management, role assignments, forced password changes, instant session revocation, and security audit inspection.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#38bdf8' }}>
                  Scope: Global (Unrestricted across all mini-factories and modules)
                </div>
              </div>

              {/* Coordinator Card */}
              <div style={{ backgroundColor: '#0d1527', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>tune</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>Module Coordinator</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  Approval, CFT assignment, verification gating, rework requests, and lifecycle transitions for their module.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#34d399' }}>
                  Scope: Restricted strictly to assigned Mini-Factory (e.g. MF2 Coordinator manages only MF2 records)
                </div>
              </div>

              {/* Committee Card */}
              <div style={{ backgroundColor: '#0d1527', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#a855f7' }}>rate_review</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#c084fc' }}>Committee Member</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  Reviewing suggestions, qualitative scoring, feasibility ratings, and action item completion.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#34d399' }}>
                  Scope: Scoped to designated factory domain
                </div>
              </div>

              {/* Initiator Card */}
              <div style={{ backgroundColor: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>edit_note</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Initiator / Operator</h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  Draft creation, photo upload, idea submission, and tracking progress of own submitted records.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Scope: Operator level in assigned plant
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Audit Logs & Security Trail ───────────────────────────── */}
        {activeTab === 'audit' && (
          <div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                backgroundColor: '#11192e',
                padding: '1rem 1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }}
                  >
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search logs, username, IP..."
                    value={auditSearchQuery}
                    onChange={(e) => {
                      setAuditSearchQuery(e.target.value);
                      setAuditPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.8rem 0.55rem 2.2rem',
                      borderRadius: '0.5rem',
                      background: '#0a0f1d',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{
                    padding: '0.55rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Actions</option>
                  <option value="user_create">User Created</option>
                  <option value="user_update">User Updated</option>
                  <option value="user_disable">User Disabled</option>
                  <option value="user_enable">User Enabled</option>
                  <option value="role_change">Role Changed</option>
                  <option value="temp_password_reset">Temp Password Reset</option>
                  <option value="password_force_change">Forced Password Change</option>
                </select>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#11192e',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0d1527', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.9rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Actor</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Target User</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Remarks</th>
                    <th style={{ padding: '0.9rem 1rem' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        Loading audit stream...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        No audit events found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.8rem 1rem', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8', fontSize: '0.75rem' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                          {log.user_name}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: log.target_user_name ? '#38bdf8' : '#64748b' }}>
                          {log.target_user_name || '—'}
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: log.action.includes('disable') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: log.action.includes('disable') ? '#f87171' : '#60a5fa',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {log.action_display || log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: '#cbd5e1' }}>{log.remarks}</td>
                        <td style={{ padding: '0.8rem 1rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748b', fontSize: '0.75rem' }}>
                          {log.ip_address || '127.0.0.1'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.9rem 1.25rem',
                  backgroundColor: '#0d1527',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                }}
              >
                <div>Showing {auditLogs.length} of {totalAuditCount} security entries</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: auditPage <= 1 ? '#475569' : '#ffffff',
                      cursor: auditPage <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>Page {auditPage}</span>
                  <button
                    disabled={auditPage * 15 >= totalAuditCount}
                    onClick={() => setAuditPage((p) => p + 1)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: auditPage * 15 >= totalAuditCount ? '#475569' : '#ffffff',
                      cursor: auditPage * 15 >= totalAuditCount ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Modal 1: Create New User ────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#11192e', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Create New Platform User</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. john.doe"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-902"
                    value={createForm.employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>First Name</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Last Name</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="employee@kspg.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Assigned Mini-Factory *</label>
                  <select
                    value={createForm.mini_factory}
                    onChange={(e) => setCreateForm({ ...createForm, mini_factory: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                  >
                    <option value="MF1">MF1 (Mini-Factory 1)</option>
                    <option value="MF2">MF2 (Mini-Factory 2)</option>
                    <option value="MF3">MF3 (Mini-Factory 3)</option>
                    <option value="Central">Plant Central / Shared</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Primary Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                  >
                    <option value="initiator">Initiator / Operator</option>
                    <option value="reviewer">Reviewer / Committee</option>
                    <option value="kaizen_lead">Coordinator / Lead</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Kaizen Module Role *</label>
                  <select
                    value={createForm.kaizen_role}
                    onChange={(e) => setCreateForm({ ...createForm, kaizen_role: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                  >
                    <option value="initiator">Initiator / Operator</option>
                    <option value="committee">Committee Member / Reviewer</option>
                    <option value="coordinator">Module Coordinator / Lead</option>
                    <option value="admin">Module Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Initial Temporary Password</label>
                  <input
                    type="text"
                    placeholder="Leave empty to auto-generate"
                    value={createForm.temporary_password}
                    onChange={(e) => setCreateForm({ ...createForm, temporary_password: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#93c5fd', marginBottom: '1.5rem' }}>
                ℹ️ The user will be created in PostgreSQL with their assigned Mini-Factory and Kaizen module role. Login credentials will be generated and displayed upon creation.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', background: '#ef4444', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Edit User Profile & Mini-Factory ────────────────────────── */}
      {showEditModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#11192e', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '540px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Edit User: {selectedUser.username}</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <form onSubmit={handleEditUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Mini-Factory Scope *</label>
                  <select
                    value={editForm.mini_factory}
                    onChange={(e) => setEditForm({ ...editForm, mini_factory: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                  >
                    <option value="MF1">MF1 (Mini-Factory 1)</option>
                    <option value="MF2">MF2 (Mini-Factory 2)</option>
                    <option value="MF3">MF3 (Mini-Factory 3)</option>
                    <option value="Central">Plant Central / Shared</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Primary Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                  >
                    <option value="initiator">Initiator / Operator</option>
                    <option value="reviewer">Reviewer / Committee</option>
                    <option value="kaizen_lead">Coordinator / Lead</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', background: '#3b82f6', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Change User's Mini-Factory (Workflow 8) ───────────────── */}
      {showMiniFactoryModal && selectedUserForMiniFactory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#11192e', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '24px' }}>factory</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Change Mini-Factory</h3>
              </div>
              <button onClick={() => setShowMiniFactoryModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#0d1527', borderRadius: '0.75rem', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>{selectedUserForMiniFactory.full_name || selectedUserForMiniFactory.username}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Employee ID: <strong style={{ color: '#cbd5e1' }}>{selectedUserForMiniFactory.employee_id}</strong> • Current Scope: <strong style={{ color: '#38bdf8' }}>{selectedUserForMiniFactory.mini_factory || 'MF1'}</strong>
              </div>
            </div>

            <form onSubmit={handleMiniFactoryChange}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Select New Working Scope *</label>
                <select
                  value={newMiniFactoryScope}
                  onChange={(e) => setNewMiniFactoryScope(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#ffffff', outline: 'none', fontSize: '0.88rem' }}
                >
                  <option value="MF1">🏭 Mini-Factory 1 (MF1)</option>
                  <option value="MF2">🏭 Mini-Factory 2 (MF2)</option>
                  <option value="MF3">🏭 Mini-Factory 3 (MF3)</option>
                  <option value="Central">🏢 Plant Central / Shared</option>
                  <option value="ALL">🌐 ALL (Global Scope across all Mini-Factories)</option>
                </select>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#7dd3fc', marginBottom: '1.5rem' }}>
                ℹ️ The new Mini-Factory scope becomes effective immediately for all future authorization checks and is recorded in the immutable audit log.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowMiniFactoryModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', background: '#0284c7', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save New Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Change User's Module Role (Workflow 9) ──────────────────── */}
      {showRoleModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#11192e', borderRadius: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#c084fc', fontSize: '24px' }}>badge</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Change Module Role</h3>
              </div>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#0d1527', borderRadius: '0.75rem', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>{selectedUser.full_name || selectedUser.username}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Employee ID: <strong style={{ color: '#cbd5e1' }}>{selectedUser.employee_id}</strong> • Primary Role: <strong style={{ color: '#c084fc' }}>{selectedUser.role_name || 'Initiator'}</strong>
              </div>
            </div>

            <form onSubmit={handleAssignModuleRole}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Select Module *</label>
                <select
                  value={moduleAssignForm.module_code}
                  onChange={(e) => setModuleAssignForm({ ...moduleAssignForm, module_code: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                >
                  <option value="kaizen">Kaizen Continuous Improvement</option>
                  <option value="fives">5S Workplace Organization</option>
                  <option value="ppsr">PPSR Problem Solving</option>
                  <option value="safety_desk">Safety Desk & Red Flags</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Select New Role *</label>
                <select
                  value={moduleAssignForm.role_name}
                  onChange={(e) => setModuleAssignForm({ ...moduleAssignForm, role_name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#ffffff', outline: 'none' }}
                >
                  <option value="initiator">Initiator / Operator</option>
                  <option value="committee">Committee Member / Reviewer</option>
                  <option value="coordinator">Module Coordinator / Lead</option>
                  <option value="admin">Module Administrator</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Mini-Factory Authorization Scope</label>
                <select
                  value={moduleAssignForm.mini_factory}
                  onChange={(e) => setModuleAssignForm({ ...moduleAssignForm, mini_factory: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.5rem', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', outline: 'none' }}
                >
                  <option value="MF1">MF1 (Mini-Factory 1)</option>
                  <option value="MF2">MF2 (Mini-Factory 2)</option>
                  <option value="MF3">MF3 (Mini-Factory 3)</option>
                  <option value="Central">Plant Central / Shared</option>
                  <option value="ALL">ALL (Global Scope across all Mini-Factories)</option>
                </select>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#e9d5ff', marginBottom: '1.5rem' }}>
                ℹ️ Replaces existing role for this module (maintains 1 role per module). New permissions become effective immediately. Historical Kaizen records remain unchanged.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', background: '#9333ea', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Apply Role Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 5: Disable / Enable User Confirmation (Workflow 10) ─────────── */}
      {showStatusConfirmModal && userToToggleStatus && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(10, 15, 29, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#11192e', borderRadius: '1.25rem', border: userToToggleStatus.is_active_employee ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)', width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: userToToggleStatus.is_active_employee ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: userToToggleStatus.is_active_employee ? '#f87171' : '#34d399',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  {userToToggleStatus.is_active_employee ? 'person_off' : 'person_check'}
                </span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  {userToToggleStatus.is_active_employee ? 'Disable User Account' : 'Re-enable User Account'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {userToToggleStatus.username} ({userToToggleStatus.employee_id})
                </div>
              </div>
            </div>

            {userToToggleStatus.is_active_employee ? (
              <div style={{ padding: '0.9rem 1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '0.75rem', fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                <strong style={{ display: 'block', color: '#f87171', marginBottom: '0.35rem' }}>⚠️ Immediate Security Actions:</strong>
                • Account is set to <strong>Inactive (is_active = false)</strong>.<br />
                • All active <strong>Redis sessions and JWT tokens will be terminated immediately</strong>.<br />
                • User will be <strong>blocked from future logins</strong>.<br />
                • Historical Kaizen submissions, reviews, and audit logs are <strong>fully preserved</strong>.
              </div>
            ) : (
              <div style={{ padding: '0.9rem 1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '0.75rem', fontSize: '0.8rem', color: '#a7f3d0', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                <strong style={{ display: 'block', color: '#34d399', marginBottom: '0.35rem' }}>✅ Account Reactivation:</strong>
                • Account status will be restored to <strong>Active</strong>.<br />
                • User will be permitted to authenticate and access their assigned modules.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowStatusConfirmModal(false);
                  setUserToToggleStatus(null);
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusActionLoading}
                onClick={confirmToggleStatus}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '0.5rem',
                  background: userToToggleStatus.is_active_employee ? '#dc2626' : '#059669',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: statusActionLoading ? 'not-allowed' : 'pointer',
                  opacity: statusActionLoading ? 0.6 : 1,
                }}
              >
                {statusActionLoading
                  ? 'Processing...'
                  : userToToggleStatus.is_active_employee
                  ? 'Confirm Disable Account'
                  : 'Confirm Enable Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      {showDetailDrawer && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10, 15, 29, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#11192e', width: '100%', maxWidth: '480px', height: '100%', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '2rem', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>User Access Profile</h3>
              <button onClick={() => setShowDetailDrawer(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: selectedUser.is_superadmin ? '#ef4444' : '#3b82f6',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                {selectedUser.first_name ? selectedUser.first_name[0].toUpperCase() : selectedUser.username[0].toUpperCase()}
              </div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{selectedUser.full_name || selectedUser.username}</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>@{selectedUser.username} • {selectedUser.employee_id}</p>
            </div>

            <div style={{ backgroundColor: '#0d1527', borderRadius: '0.75rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Profile Overview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div><span style={{ color: '#64748b' }}>Email:</span> <div style={{ color: '#f8fafc' }}>{selectedUser.email || '—'}</div></div>
                <div><span style={{ color: '#64748b' }}>Phone:</span> <div style={{ color: '#f8fafc' }}>{selectedUser.phone || '—'}</div></div>
                <div><span style={{ color: '#64748b' }}>Mini-Factory:</span> <div style={{ color: '#38bdf8', fontWeight: 700 }}>{selectedUser.mini_factory}</div></div>
                <div><span style={{ color: '#64748b' }}>Primary Role:</span> <div style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedUser.role_name || 'Initiator'}</div></div>
                <div><span style={{ color: '#64748b' }}>Department:</span> <div style={{ color: '#f8fafc' }}>{selectedUser.department || '—'}</div></div>
                <div><span style={{ color: '#64748b' }}>Designation:</span> <div style={{ color: '#f8fafc' }}>{selectedUser.designation || '—'}</div></div>
                <div><span style={{ color: '#64748b' }}>Password Status:</span> <div style={{ color: selectedUser.must_change_password ? '#fbbf24' : '#34d399', fontWeight: 700 }}>{selectedUser.must_change_password ? 'Temp Password Active' : 'Permanent Verified'}</div></div>
                <div><span style={{ color: '#64748b' }}>Account Status:</span> <div style={{ color: selectedUser.is_active_employee ? '#34d399' : '#f87171', fontWeight: 700 }}>{selectedUser.is_active_employee ? 'Active' : 'Disabled'}</div></div>
              </div>
            </div>

            <div style={{ backgroundColor: '#0d1527', borderRadius: '0.75rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Module Role Assignments
              </div>
              {selectedUser.module_roles?.length ? (
                selectedUser.module_roles.map((mr) => (
                  <div key={mr.module_code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{mr.module_display || mr.module_code}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Scope: {mr.mini_factory}</div>
                    </div>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700, fontSize: '0.75rem' }}>
                      {mr.role_name.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Default role assigned: Initiator (MF1)</div>
              )}
            </div>

            {/* Quick Actions Grid inside Drawer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
              {/* Change Mini-Factory */}
              <button
                onClick={() => openMiniFactoryModal(selectedUser)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>factory</span>
                Change MF Scope
              </button>

              {/* Change Module Role */}
              <button
                onClick={() => openRoleModal(selectedUser)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>badge</span>
                Change Role
              </button>

              {/* Edit Profile */}
              <button
                onClick={() => openEditModal(selectedUser)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>edit</span>
                Edit Profile
              </button>

              {/* Reset Password */}
              <button
                onClick={() => handleResetTempPassword(selectedUser)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>key</span>
                Reset Password
              </button>
            </div>

            {/* Disable / Enable Action */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => openStatusConfirmModal(selectedUser)}
                disabled={selectedUser.id === currentUser?.id}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '0.5rem',
                  background: selectedUser.is_active_employee ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: selectedUser.is_active_employee ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                  color: selectedUser.is_active_employee ? '#f87171' : '#34d399',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: selectedUser.id === currentUser?.id ? 'not-allowed' : 'pointer',
                  opacity: selectedUser.id === currentUser?.id ? 0.3 : 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {selectedUser.is_active_employee ? 'block' : 'check_circle'}
                </span>
                {selectedUser.is_active_employee ? 'Disable Account' : 'Enable Account'}
              </button>

              <button
                onClick={() => handleDeleteUser(selectedUser)}
                disabled={selectedUser.id === currentUser?.id}
                style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  cursor: selectedUser.id === currentUser?.id ? 'not-allowed' : 'pointer',
                  opacity: selectedUser.id === currentUser?.id ? 0.3 : 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
