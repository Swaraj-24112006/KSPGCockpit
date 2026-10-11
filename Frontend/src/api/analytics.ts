/**
 * analytics.ts
 * ============
 * Type-safe API client for Live Kaizen Analytics endpoints.
 * Integrates with authFetch and dispatches/listens to invalidation events.
 */

import { authFetch } from '../shared/utils/auth';
import {
  AnalyticsFilters,
  DashboardAnalytics,
  ExecutiveAnalytics,
  EmployeeLeaderboard
} from '../types';

// Custom event name for instant cross-component analytics cache invalidation
export const ANALYTICS_INVALIDATE_EVENT = 'kspg:analytics-invalidate';

export function triggerAnalyticsInvalidation(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ANALYTICS_INVALIDATE_EVENT));
  }
}

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function fetchAnalyticsJson<T>(primaryUrl: string, fallbackUrl: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(primaryUrl, { signal });
    if (!res.ok && res.status === 404 && fallbackUrl) {
      res = await authFetch(fallbackUrl, { signal });
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    if (fallbackUrl) {
      res = await authFetch(fallbackUrl, { signal });
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    let errText = `Analytics request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      errText = JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(errText);
  }

  return await res.json();
}

/**
 * GET /api/v1/kaizen/analytics/dashboard/
 */
export async function fetchDashboardAnalytics(
  filters?: Partial<AnalyticsFilters>,
  signal?: AbortSignal
): Promise<DashboardAnalytics> {
  const qs = buildQueryString(filters);
  return fetchAnalyticsJson<DashboardAnalytics>(
    `/api/v1/kaizen/analytics/dashboard/${qs}`,
    `/api/kaizen/analytics/dashboard/${qs}`,
    signal
  );
}

/**
 * GET /api/v1/kaizen/analytics/executive/
 */
export async function fetchExecutiveAnalytics(
  filters?: Partial<AnalyticsFilters>,
  signal?: AbortSignal
): Promise<ExecutiveAnalytics> {
  const qs = buildQueryString(filters);
  return fetchAnalyticsJson<ExecutiveAnalytics>(
    `/api/v1/kaizen/analytics/executive/${qs}`,
    `/api/kaizen/analytics/executive/${qs}`,
    signal
  );
}

/**
 * GET /api/v1/kaizen/analytics/employees/
 */
export async function fetchEmployeeLeaderboard(
  filters?: Partial<AnalyticsFilters>,
  signal?: AbortSignal
): Promise<EmployeeLeaderboard> {
  const qs = buildQueryString(filters);
  return fetchAnalyticsJson<EmployeeLeaderboard>(
    `/api/v1/kaizen/analytics/employees/${qs}`,
    `/api/kaizen/analytics/employees/${qs}`,
    signal
  );
}
