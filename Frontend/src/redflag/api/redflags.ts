import {
  RedFlag,
  UserMe,
  LookupsResponse,
  RedFlagDashboardAnalytics,
  RedFlagExecutiveAnalytics,
  RedFlagSummaryAnalytics
} from '../../types';

export class ApiError extends Error {
  public status: number;
  public details?: any;
  public isConflict: boolean;

  constructor(status: number, message: string, details?: any, isConflict = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isConflict = isConflict || status === 409;
  }
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  [key: string]: any;
}

export interface RedFlagFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  severity?: string;
  category5M?: string;
  defectType?: string;
  plant?: string;
  originatingDept?: string;
  targetDept?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export interface PaginatedRedFlags {
  count: number;
  next: string | null;
  previous: string | null;
  results: RedFlag[];
}

export interface RaiseRedFlagPayload {
  description: string;
  evidenceAttachmentId?: string;
  evidencePhoto?: string;
  plantId?: string;
  plant?: string;
  lineId?: string;
  line?: string;
  stationId?: string;
  station?: string;
  modelId?: string;
  model?: string;
  redFlagType: string;
  redFlagSubType?: string;
  severity: string;
  category5M: string;
  targetDepartmentId?: string;
  targetDepartment: string;
  targetPersonId?: string;
  targetPerson: string;
  qaCustodianId?: string;
  qaCustodian?: string;
  repetitiveOccurrence?: string;
  targetDate?: string;
  raisedBy?: string;
  raisedByDepartment?: string;
  raisedByRole?: string;
  raisedTimestamp?: string;
}

export interface ContainmentSubmitPayload {
  containmentAction: string;
  suspectQtyQuarantined?: number;
  quarantineTagNo?: string;
  quarantineLocation?: string;
  sortingQtyInspected?: number;
  sortingQtyOk?: number;
  sortingQtyRejected?: number;
  countermeasureAttachmentId?: string;
  countermeasurePhoto?: string;
  containmentTimestamp?: string;
  actionTakenBy?: string;
  rowVersion?: number;
}

export interface RootCauseSubmitPayload {
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  rootCause5Why: string;
  systematicPermanentAction: string;
  targetDate?: string;
  standardizationUpdates?: {
    sopUpdated?: boolean;
    pfmeaUpdated?: boolean;
    controlPlanUpdated?: boolean;
    onePointLessonIssued?: boolean;
  };
  rowVersion?: number;
}

export interface SustenanceStartPayload {
  notes?: string;
  startDate?: string;
  updates?: {
    sopUpdated?: boolean;
    pfmeaUpdated?: boolean;
    controlPlanUpdated?: boolean;
    onePointLessonIssued?: boolean;
  };
  rowVersion?: number;
}

export interface SustenanceAuditPayload {
  status: 'Passed' | 'Recurrence Detected' | 'Pending';
  observations?: string;
  evidenceAttachmentId?: string;
  photoEvidence?: string;
  auditDate?: string;
  rowVersion?: number;
}

export interface CloseRedFlagPayload {
  validationTrialShifts?: number;
  validationTrialResults?: string;
  closureEvidenceAttachmentId?: string;
  closureEvidence?: string;
  approvedByQA?: string;
  approvedByProduction?: string;
  closureDate?: string;
  earlyClosureReason?: string;
  rowVersion?: number;
}

const API_BASE = (import.meta.env.VITE_REDFLAG_API_URL || '').replace(/\/+$/, '');

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers = new Headers(options.headers || {});

  // Attach JWT Bearer token if user is authenticated
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('kspg_access_token') || localStorage.getItem('access_token'))
    : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method?.toUpperCase() || 'GET')) {
    headers.set('X-CSRFToken', csrfToken);
  }

  // Set default JSON Content-Type if not multipart/FormData and body is present
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const targetUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(targetUrl, {
    ...options,
    headers,
    credentials: 'include'
  });

  // Handle CSV and binary streams
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error ${response.status} exporting CSV`);
    }
    return (await response.blob()) as unknown as T;
  }

  let data: any = null;
  const isJson = contentType.includes('application/json');
  if (isJson) {
    try {
      data = await response.json();
    } catch (err) {
      if (!response.ok) {
        throw new ApiError(response.status, `HTTP ${response.status}: Server returned invalid JSON response.`);
      }
    }
  } else {
    const rawText = await response.text();
    const isHtml = rawText.includes('<html') || rawText.includes('<!DOCTYPE') || rawText.includes('<!doctype');
    if (isHtml) {
      throw new ApiError(
        response.status,
        `Backend returned HTML (${response.status} ${response.statusText}). Check that config/urls.py on port 8003 has redflag routes configured.`
      );
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.detail || `HTTP ${response.status}: Request failed`;
    const details = data?.details || (typeof data === 'object' ? data : undefined);
    throw new ApiError(response.status, errorMsg, details, response.status === 409);
  }

  // Handle both { success: true, data: ... } and direct payloads
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success && data.error) {
      throw new ApiError(response.status, data.error, data.details);
    }
    return (data.data !== undefined ? data.data : data) as T;
  }

  return data as T;
}

// ----------------- API Endpoints -----------------

export async function fetchMe(): Promise<UserMe> {
  return apiFetch<UserMe>('/api/redflags/me');
}

export async function fetchLookups(): Promise<LookupsResponse> {
  return apiFetch<LookupsResponse>('/api/redflags/lookups');
}

export async function fetchRedFlags(params: RedFlagFilterParams = {}): Promise<PaginatedRedFlags | RedFlag[]> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'All') query.set('status', params.status);
  if (params.severity && params.severity !== 'All') query.set('severity', params.severity);
  if (params.category5M && params.category5M !== 'All') query.set('category_5m', params.category5M);
  if (params.defectType && params.defectType !== 'All') query.set('defect_type', params.defectType);
  if (params.plant && params.plant !== 'All') query.set('plant', params.plant);
  if (params.originatingDept && params.originatingDept !== 'All') query.set('originating_dept', params.originatingDept);
  if (params.targetDept && params.targetDept !== 'All') query.set('target_dept', params.targetDept);
  if (params.dateFrom) query.set('date_from', params.dateFrom);
  if (params.dateTo) query.set('date_to', params.dateTo);

  const qs = query.toString();
  const url = `/api/redflags${qs ? `?${qs}` : ''}`;
  return apiFetch<PaginatedRedFlags | RedFlag[]>(url);
}

export async function fetchRedFlag(id: string): Promise<RedFlag> {
  return apiFetch<RedFlag>(`/api/redflags/${id}`);
}

export async function raiseRedFlag(payload: RaiseRedFlagPayload): Promise<RedFlag> {
  return apiFetch<RedFlag>('/api/redflags', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function patchRedFlag(id: string, payload: Partial<RedFlag>, rowVersion?: number): Promise<RedFlag> {
  const body = {
    ...payload,
    ...(rowVersion !== undefined ? { rowVersion } : {})
  };
  return apiFetch<RedFlag>(`/api/redflags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export async function deleteRedFlag(id: string, reason: string): Promise<void> {
  await apiFetch(`/api/redflags/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason })
  });
}

export async function uploadAttachment(file: Blob | File, kind: string = 'evidence_photo'): Promise<{ id: string; url: string; kind: string }> {
  const formData = new FormData();
  const filename = (file instanceof File && file.name)
    ? file.name
    : (kind === 'countermeasure_photo' ? 'containment.png' : 'evidence.png');
  formData.append('file', file, filename);
  formData.append('kind', kind);

  return apiFetch<{ id: string; url: string; kind: string }>('/api/redflags/attachments', {
    method: 'POST',
    body: formData
  });
}

export async function submitContainment(id: string, payload: ContainmentSubmitPayload, rowVersion?: number): Promise<RedFlag> {
  const body = {
    ...payload,
    ...(rowVersion !== undefined ? { rowVersion } : {})
  };
  return apiFetch<RedFlag>(`/api/redflags/${id}/containment`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function approveContainment(id: string, notes?: string, rowVersion?: number): Promise<RedFlag> {
  const body: any = {};
  if (notes) body.notes = notes;
  if (rowVersion !== undefined) body.rowVersion = rowVersion;

  return apiFetch<RedFlag>(`/api/redflags/${id}/containment/approve`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function rejectContainment(id: string, reason: string, rowVersion?: number): Promise<RedFlag> {
  const body: any = { reason };
  if (rowVersion !== undefined) body.rowVersion = rowVersion;

  return apiFetch<RedFlag>(`/api/redflags/${id}/containment/reject`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function saveRootCause(id: string, payload: RootCauseSubmitPayload, rowVersion?: number): Promise<RedFlag> {
  const body = {
    ...payload,
    ...(rowVersion !== undefined ? { rowVersion } : {})
  };
  return apiFetch<RedFlag>(`/api/redflags/${id}/root-cause`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function startSustenance(id: string, payload: SustenanceStartPayload = {}, rowVersion?: number): Promise<RedFlag> {
  const body = {
    ...payload,
    ...(rowVersion !== undefined ? { rowVersion } : {})
  };
  return apiFetch<RedFlag>(`/api/redflags/${id}/sustenance/start`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function logAudit(id: string, month: 1 | 2 | 3, payload: SustenanceAuditPayload, rowVersion?: number): Promise<RedFlag> {
  const body = {
    ...payload,
    ...(rowVersion !== undefined ? { rowVersion } : {})
  };
  return apiFetch<RedFlag>(`/api/redflags/${id}/sustenance/checks/${month}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function closeRedFlag(id: string, payload: CloseRedFlagPayload, rowVersion?: number): Promise<RedFlag> {
  const body = {
    ...payload,
    ...(rowVersion !== undefined ? { rowVersion } : {})
  };
  return apiFetch<RedFlag>(`/api/redflags/${id}/close`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function escalatePpsr(id: string): Promise<{ redFlag: RedFlag; ppsr?: any; refNo?: string }> {
  return apiFetch<{ redFlag: RedFlag; ppsr?: any; refNo?: string }>(`/api/redflags/${id}/escalate-ppsr`, {
    method: 'POST'
  });
}

export async function convertKaizen(id: string): Promise<{ redFlag: RedFlag; kaizen?: any; refNo?: string }> {
  return apiFetch<{ redFlag: RedFlag; kaizen?: any; refNo?: string }>(`/api/redflags/${id}/convert-kaizen`, {
    method: 'POST'
  });
}

export async function linkFiveS(id: string): Promise<{ redFlag: RedFlag; redTag?: any; refNo?: string }> {
  return apiFetch<{ redFlag: RedFlag; redTag?: any; refNo?: string }>(`/api/redflags/${id}/link-fives`, {
    method: 'POST'
  });
}

export async function fetchPresentationData(id: string, slide?: number): Promise<any> {
  const qs = slide ? `?slide=${slide}` : '';
  return apiFetch<any>(`/api/redflags/${id}/presentation${qs}`);
}

export async function fetchDashboardAnalytics(filters: Record<string, string> = {}): Promise<RedFlagDashboardAnalytics> {
  const query = new URLSearchParams(filters);
  const qs = query.toString();
  return apiFetch<RedFlagDashboardAnalytics>(`/api/redflags/analytics/dashboard${qs ? `?${qs}` : ''}`);
}

export async function fetchExecutiveAnalytics(filters: Record<string, string> = {}): Promise<RedFlagExecutiveAnalytics> {
  const query = new URLSearchParams(filters);
  const qs = query.toString();
  return apiFetch<RedFlagExecutiveAnalytics>(`/api/redflags/analytics/executive${qs ? `?${qs}` : ''}`);
}

export async function fetchSummaryAnalytics(filters: Record<string, string> = {}): Promise<RedFlagSummaryAnalytics> {
  const query = new URLSearchParams(filters);
  const qs = query.toString();
  return apiFetch<RedFlagSummaryAnalytics>(`/api/redflags/analytics/summary${qs ? `?${qs}` : ''}`);
}

export function getExportCsvUrl(filters: Record<string, string> = {}): string {
  const query = new URLSearchParams(filters);
  const qs = query.toString();
  return `${API_BASE}/api/redflags/export.csv${qs ? `?${qs}` : ''}`;
}

export async function downloadExportCsv(filters: Record<string, string> = {}): Promise<Blob> {
  return apiFetch<Blob>(getExportCsvUrl(filters));
}

