import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  RedFlag,
  UserMe,
  LookupsResponse,
} from '../types';
import * as api from '../api/redflags';

export interface RedFlagActions {
  raiseRedFlag: (payload: api.RaiseRedFlagPayload) => Promise<RedFlag>;
  patchRedFlag: (id: string, payload: Partial<RedFlag>, rowVersion?: number) => Promise<RedFlag>;
  deleteRedFlag: (id: string, reason: string) => Promise<void>;
  submitContainment: (id: string, payload: api.ContainmentSubmitPayload, rowVersion?: number) => Promise<RedFlag>;
  approveContainment: (id: string, notes?: string, rowVersion?: number) => Promise<RedFlag>;
  rejectContainment: (id: string, reason: string, rowVersion?: number) => Promise<RedFlag>;
  saveRootCause: (id: string, payload: api.RootCauseSubmitPayload, rowVersion?: number) => Promise<RedFlag>;
  startSustenance: (id: string, payload?: api.SustenanceStartPayload, rowVersion?: number) => Promise<RedFlag>;
  logAudit: (id: string, month: 1 | 2 | 3, payload: api.SustenanceAuditPayload, rowVersion?: number) => Promise<RedFlag>;
  closeRedFlag: (id: string, payload: api.CloseRedFlagPayload, rowVersion?: number) => Promise<RedFlag>;
  escalatePpsr: (id: string) => Promise<{ redFlag: RedFlag; ppsr?: any; refNo?: string }>;
  convertKaizen: (id: string) => Promise<{ redFlag: RedFlag; kaizen?: any; refNo?: string }>;
  linkFiveS: (id: string) => Promise<{ redFlag: RedFlag; redTag?: any; refNo?: string }>;
  uploadAttachment: (file: Blob | File, kind?: string) => Promise<{ id: string; url: string; kind: string }>;
  downloadCsv: (filters?: Record<string, string>) => Promise<void>;
  reloadFlag: (id: string) => Promise<RedFlag>;
}

export interface RedFlagContextType {
  currentUser: UserMe | null;
  lookups: LookupsResponse | null;
  redFlags: RedFlag[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: api.RedFlagFilterParams;
  setFilters: (filters: Partial<api.RedFlagFilterParams>) => void;
  setPage: (page: number) => void;
  isLoading: boolean;
  refreshFlags: () => Promise<void>;
  actions: RedFlagActions;
  showDevRoleSwitch: boolean;
  conflictNotification: string | null;
  clearConflictNotification: () => void;
}

const RedFlagContext = createContext<RedFlagContextType | undefined>(undefined);

export function RedFlagProvider({
  children,
  initialFlags = [],
  onFlagListChanged
}: {
  children: ReactNode;
  initialFlags?: RedFlag[];
  onFlagListChanged?: (flags: RedFlag[]) => void;
}) {
  const [currentUser, setCurrentUser] = useState<UserMe | null>(null);
  const [lookups, setLookups] = useState<LookupsResponse | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlag[]>(initialFlags);
  const [totalCount, setTotalCount] = useState<number>(initialFlags.length);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [filters, setFiltersState] = useState<api.RedFlagFilterParams>({
    status: 'All',
    severity: 'All',
    category5M: 'All',
    search: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conflictNotification, setConflictNotification] = useState<string | null>(null);

  const showDevRoleSwitch = (import.meta as any).env?.VITE_REDFLAG_DEV_ROLE_SWITCH === 'true';

  // Load user profile & lookups on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBootstrap() {
      try {
        const [meData, lookupsData] = await Promise.all([
          api.fetchMe().catch(() => null),
          api.fetchLookups().catch(() => null)
        ]);
        if (isMounted) {
          if (meData) setCurrentUser(meData);
          if (lookupsData) setLookups(lookupsData);
        }
      } catch (err) {
        console.error('Error bootstrapping Red Flag context:', err);
      }
    }
    loadBootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.fetchRedFlags({
        ...filters,
        page: currentPage,
        pageSize
      });
      if (Array.isArray(res)) {
        setRedFlags(res);
        setTotalCount(res.length);
        if (onFlagListChanged) onFlagListChanged(res);
      } else if (res && res.results) {
        setRedFlags(res.results);
        setTotalCount(res.count);
        if (onFlagListChanged) onFlagListChanged(res.results);
      }
    } catch (err) {
      console.error('Error fetching red flags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, onFlagListChanged]);

  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  const setFilters = (newFilters: Partial<api.RedFlagFilterParams>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // reset to page 1 on filter changes
  };

  const setPage = (page: number) => {
    setCurrentPage(page);
  };

  const updateFlagInList = useCallback((updated: RedFlag) => {
    setRedFlags(prev => {
      const exists = prev.some(r => r.id === updated.id);
      const nextList = exists
        ? prev.map(r => (r.id === updated.id ? updated : r))
        : [updated, ...prev];
      if (onFlagListChanged) onFlagListChanged(nextList);
      return nextList;
    });
  }, [onFlagListChanged]);

  const reloadFlag = useCallback(async (id: string): Promise<RedFlag> => {
    const flag = await api.fetchRedFlag(id);
    updateFlagInList(flag);
    return flag;
  }, [updateFlagInList]);

  const handleConflictError = useCallback(async (id: string, err: any) => {
    if (err instanceof api.ApiError && err.isConflict) {
      setConflictNotification('This Red Flag was modified by another user. Reloading latest version...');
      try {
        await reloadFlag(id);
      } catch (reloadErr) {
        console.error('Failed to reload after conflict:', reloadErr);
      }
    }
  }, [reloadFlag]);

  // Actions
  const actions: RedFlagActions = {
    raiseRedFlag: async (payload) => {
      const created = await api.raiseRedFlag(payload);
      setRedFlags(prev => {
        const nextList = [created, ...prev];
        if (onFlagListChanged) onFlagListChanged(nextList);
        return nextList;
      });
      setTotalCount(prev => prev + 1);
      return created;
    },

    patchRedFlag: async (id, payload, rowVersion) => {
      try {
        const updated = await api.patchRedFlag(id, payload, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    deleteRedFlag: async (id, reason) => {
      await api.deleteRedFlag(id, reason);
      setRedFlags(prev => {
        const nextList = prev.filter(r => r.id !== id);
        if (onFlagListChanged) onFlagListChanged(nextList);
        return nextList;
      });
      setTotalCount(prev => Math.max(0, prev - 1));
    },

    submitContainment: async (id, payload, rowVersion) => {
      try {
        const updated = await api.submitContainment(id, payload, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    approveContainment: async (id, notes, rowVersion) => {
      try {
        const updated = await api.approveContainment(id, notes, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    rejectContainment: async (id, reason, rowVersion) => {
      try {
        const updated = await api.rejectContainment(id, reason, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    saveRootCause: async (id, payload, rowVersion) => {
      try {
        const updated = await api.saveRootCause(id, payload, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    startSustenance: async (id, payload, rowVersion) => {
      try {
        const updated = await api.startSustenance(id, payload, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    logAudit: async (id, month, payload, rowVersion) => {
      try {
        const updated = await api.logAudit(id, month, payload, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    closeRedFlag: async (id, payload, rowVersion) => {
      try {
        const updated = await api.closeRedFlag(id, payload, rowVersion);
        updateFlagInList(updated);
        return updated;
      } catch (err: any) {
        await handleConflictError(id, err);
        throw err;
      }
    },

    escalatePpsr: async (id) => {
      const res = await api.escalatePpsr(id);
      if (res.redFlag) updateFlagInList(res.redFlag);
      return res;
    },

    convertKaizen: async (id) => {
      const res = await api.convertKaizen(id);
      if (res.redFlag) updateFlagInList(res.redFlag);
      return res;
    },

    linkFiveS: async (id) => {
      const res = await api.linkFiveS(id);
      if (res.redFlag) updateFlagInList(res.redFlag);
      return res;
    },

    uploadAttachment: async (file, kind) => {
      return api.uploadAttachment(file, kind);
    },

    downloadCsv: async (customFilters) => {
      const filterObj = { ...(customFilters || filters) };
      const blob = await api.downloadExportCsv(filterObj as Record<string, string>);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SFC_RedFlags_Master_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    reloadFlag
  };

  return (
    <RedFlagContext.Provider
      value={{
        currentUser,
        lookups,
        redFlags,
        totalCount,
        currentPage,
        pageSize,
        filters,
        setFilters,
        setPage,
        isLoading,
        refreshFlags,
        actions,
        showDevRoleSwitch,
        conflictNotification,
        clearConflictNotification: () => setConflictNotification(null)
      }}
    >
      {conflictNotification && (
        <div className="fixed top-4 right-4 z-50 bg-amber-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-bounce">
          <span className="font-bold">⚠️ Warning:</span>
          <span>{conflictNotification}</span>
          <button
            onClick={() => setConflictNotification(null)}
            className="ml-2 font-black cursor-pointer text-white hover:text-amber-200"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </RedFlagContext.Provider>
  );
}

export function useRedFlag() {
  const context = useContext(RedFlagContext);
  if (!context) {
    throw new Error('useRedFlag must be used within a RedFlagProvider');
  }
  return context;
}

export function useRedFlagLookups() {
  const { lookups, currentUser, isLoading } = useRedFlag();
  return {
    lookups,
    currentUser,
    isLoading,
    plants: lookups?.plants || [],
    models: lookups?.models || [],
    departments: lookups?.departments || [],
    employees: lookups?.employees || [],
    enums: lookups?.enums,
    config: lookups?.config,
  };
}
