/**
 * api.ts — SuperAdmin API Client Layer
 * =====================================
 * Wraps authFetch with robust JSON error parsing, structured SuperAdminApiError,
 * support for AbortSignal cancellation, and clear status messages for 401, 403, and 429.
 */

import { authFetch } from '../shared/utils/auth';
import type { PaginatedResponse, SummaryData, UserRow, AuditLogRow, RbacMetadata } from './types';

export class SuperAdminApiError extends Error {
  status?: number;
  fields?: Record<string, string[]>;
  data?: any;

  constructor(message: string, status?: number, fields?: Record<string, string[]>, data?: any) {
    super(message);
    this.name = 'SuperAdminApiError';
    this.status = status;
    this.fields = fields;
    this.data = data;
    Object.setPrototypeOf(this, SuperAdminApiError.prototype);
  }
}

/**
 * SuperAdmin API fetch wrapper over authFetch.
 * Safely parses response JSON, supports AbortSignal, and normalizes errors.
 */
export async function superAdminFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(url, options);
  } catch (err: any) {
    if (err?.name === 'AbortError' || options.signal?.aborted) {
      throw err;
    }
    throw new SuperAdminApiError(
      err?.message || 'Unable to connect to server. Please check your network or server status.',
      0
    );
  }

  // Safe JSON extraction
  let json: any = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  // 401 Unauthorized
  if (res.status === 401) {
    const msg = json?.error?.message || 'Session expired or unauthorized. Please sign in again.';
    throw new SuperAdminApiError(msg, 401, json?.error?.fields, json);
  }

  // 403 Forbidden
  if (res.status === 403) {
    const msg = json?.error?.message || 'Permission denied. Super Administrator access required.';
    throw new SuperAdminApiError(msg, 403, json?.error?.fields, json);
  }

  // 429 Rate Limit Exceeded
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const defaultMsg = retryAfter
      ? `Request rate limit reached. Please wait ${retryAfter} seconds before retrying.`
      : 'Too many requests. Please wait a moment and try again.';
    const msg = json?.error?.message || defaultMsg;
    throw new SuperAdminApiError(msg, 429, json?.error?.fields, json);
  }

  // General HTTP error status
  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      json?.detail ||
      `Request failed with HTTP status ${res.status}.`;
    throw new SuperAdminApiError(msg, res.status, json?.error?.fields, json);
  }

  // Explicit failure payload from backend ({ success: false, error: { message } })
  if (json && typeof json === 'object' && json.success === false) {
    const msg = json?.error?.message || json?.message || 'Operation failed.';
    throw new SuperAdminApiError(msg, res.status, json?.error?.fields, json);
  }

  return json as T;
}

// ─── SuperAdmin API Endpoints ──────────────────────────────────────────────

export const superAdminApi = {
  /**
   * Fetch platform KPI summary metrics and security health.
   */
  async getSummary(signal?: AbortSignal): Promise<SummaryData> {
    const res = await superAdminFetch<{ success: boolean; data: SummaryData }>(
      '/api/v1/auth/superadmin/summary/',
      { method: 'GET', signal }
    );
    return res.data;
  },

  /**
   * Fetch server-side paginated and filtered users.
   */
  async getUsers(params: URLSearchParams, signal?: AbortSignal): Promise<PaginatedResponse<UserRow>> {
    const qs = params.toString();
    const url = `/api/v1/auth/superadmin/users/${qs ? `?${qs}` : ''}`;
    return superAdminFetch<PaginatedResponse<UserRow>>(url, { method: 'GET', signal });
  },

  /**
   * Fetch user details by ID.
   */
  async getUser(id: number, signal?: AbortSignal): Promise<UserRow> {
    return superAdminFetch<UserRow>(`/api/v1/auth/superadmin/users/${id}/`, {
      method: 'GET',
      signal,
    });
  },

  /**
   * Alias for getUser
   */
  async getUserDetail(id: number, signal?: AbortSignal): Promise<UserRow> {
    return this.getUser(id, signal);
  },

  /**
   * Create a new platform user.
   */
  async createUser(payload: Record<string, any>, signal?: AbortSignal): Promise<{ success: boolean; data: UserRow; warning?: string }> {
    return superAdminFetch('/api/v1/auth/superadmin/users/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  },

  /**
   * Partially update user attributes and module roles.
   */
  async updateUser(id: number, payload: Record<string, any>, signal?: AbortSignal): Promise<{ success: boolean; data: UserRow }> {
    return superAdminFetch(`/api/v1/auth/superadmin/users/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  },

  /**
   * Permanently delete a user account.
   */
  async deleteUser(id: number, options?: { force?: boolean; signal?: AbortSignal }): Promise<{ success: boolean; message: string }> {
    const qs = options?.force ? '?force=true' : '';
    return superAdminFetch(`/api/v1/auth/superadmin/users/${id}/${qs}`, {
      method: 'DELETE',
      signal: options?.signal,
    });
  },

  /**
   * Toggle user active/disabled status and revoke sessions.
   */
  async toggleUserStatus(id: number, signal?: AbortSignal): Promise<{ success: boolean; data: UserRow }> {
    return superAdminFetch(`/api/v1/auth/superadmin/users/${id}/toggle-status/`, {
      method: 'POST',
      signal,
    });
  },

  /**
   * Change a user's primary Mini-Factory assignment.
   */
  async changeMiniFactory(id: number, mini_factory: string, signal?: AbortSignal): Promise<{ success: boolean; data: UserRow }> {
    return superAdminFetch(`/api/v1/auth/superadmin/users/${id}/change-mini-factory/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mini_factory }),
      signal,
    });
  },

  /**
   * Reset user password with a high-entropy temporary password.
   */
  async resetTempPassword(id: number, signal?: AbortSignal): Promise<{ success: boolean; temporary_password?: string; temporaryPassword?: string }> {
    return superAdminFetch(`/api/v1/auth/superadmin/users/${id}/reset-temp-password/`, {
      method: 'POST',
      signal,
    });
  },

  /**
   * Assign or revoke a module-specific role.
   */
  async assignModuleRole(
    id: number,
    payload: { module_code: string; role_name: string; mini_factory?: string },
    signal?: AbortSignal
  ): Promise<{ success: boolean; data: UserRow }> {
    return superAdminFetch(`/api/v1/auth/superadmin/users/${id}/assign-module-role/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  },

  /**
   * Fetch server-side paginated audit logs.
   */
  async getAuditLogs(params: URLSearchParams, signal?: AbortSignal): Promise<PaginatedResponse<AuditLogRow>> {
    const qs = params.toString();
    const url = `/api/v1/auth/superadmin/audit-logs/${qs ? `?${qs}` : ''}`;
    return superAdminFetch<PaginatedResponse<AuditLogRow>>(url, { method: 'GET', signal });
  },

  /**
   * Fetch RBAC metadata (roles and module map).
   */
  async getRbacMetadata(signal?: AbortSignal): Promise<RbacMetadata> {
    const res = await superAdminFetch<{ success: boolean; data: RbacMetadata }>(
      '/api/v1/auth/superadmin/rbac-metadata/',
      { method: 'GET', signal }
    );
    return res.data;
  },
};

