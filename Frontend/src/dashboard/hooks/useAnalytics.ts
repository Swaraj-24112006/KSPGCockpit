/**
 * useAnalytics.ts
 * ================
 * Lightweight, high-resilience React hooks for Live Kaizen Analytics.
 * Supports:
 * - 60s background freshness polling
 * - Immediate refetch on window focus
 * - Instant cross-tab invalidation upon Kaizen create/update/decision
 * - Retains existing UI data during slicer adjustments (smooth transition)
 * - AbortController cleanup
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchDashboardAnalytics,
  fetchExecutiveAnalytics,
  fetchEmployeeLeaderboard,
  ANALYTICS_INVALIDATE_EVENT
} from '../../api/analytics';
import {
  AnalyticsFilters,
  DashboardAnalytics,
  ExecutiveAnalytics,
  EmployeeLeaderboard
} from '../../types';

interface UseAnalyticsResult<T> {
  data: T | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useGenericAnalytics<T>(
  fetchFn: (filters?: Partial<AnalyticsFilters>, signal?: AbortSignal) => Promise<T>,
  filters?: Partial<AnalyticsFilters>
): UseAnalyticsResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersKey = JSON.stringify(filters || {});

  const executeFetch = useCallback(async (isInitial = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isInitial && !data) {
      setIsLoading(true);
    }
    setIsFetching(true);
    setError(null);

    try {
      const result = await fetchFn(filters, controller.signal);
      setData(result);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [fetchFn, filtersKey]);

  useEffect(() => {
    executeFetch(true);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeFetch]);

  // Periodic 60s polling & Window Focus & Invalidation Listeners
  useEffect(() => {
    const interval = setInterval(() => {
      executeFetch(false);
    }, 60000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeFetch(false);
      }
    };

    const handleInvalidation = () => {
      executeFetch(false);
    };

    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);
    window.addEventListener(ANALYTICS_INVALIDATE_EVENT, handleInvalidation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(ANALYTICS_INVALIDATE_EVENT, handleInvalidation);
    };
  }, [executeFetch]);

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: () => executeFetch(false),
  };
}

export function useDashboardAnalytics(filters?: Partial<AnalyticsFilters>): UseAnalyticsResult<DashboardAnalytics> {
  return useGenericAnalytics(fetchDashboardAnalytics, filters);
}

export function useExecutiveAnalytics(filters?: Partial<AnalyticsFilters>): UseAnalyticsResult<ExecutiveAnalytics> {
  return useGenericAnalytics(fetchExecutiveAnalytics, filters);
}

export function useEmployeeLeaderboard(filters?: Partial<AnalyticsFilters>): UseAnalyticsResult<EmployeeLeaderboard> {
  return useGenericAnalytics(fetchEmployeeLeaderboard, filters);
}
