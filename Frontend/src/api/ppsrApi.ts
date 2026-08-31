/**
 * PPSR API Client — Axios Instance with Global 429 Rate-Limit Interceptor
 * =======================================================================
 * Automatically attaches JWT authentication bearer token and intercepts 429
 * responses to dispatch a CustomEvent for toast/alert notifications.
 */

import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 429 Too Many Requests globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const waitSeconds = retryAfter ? parseInt(retryAfter as string, 10) : 60;
      const waitMinutes = Math.ceil(waitSeconds / 60);

      window.dispatchEvent(
        new CustomEvent('ppsr:rate-limited', {
          detail: {
            message: `Too many requests. Please wait ${waitMinutes} minute(s) before trying again.`,
            retryAfter: waitSeconds,
          },
        })
      );
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * Trigger async PDF export generation on the server.
 */
export async function triggerPpsrPdfExport(reportId: string): Promise<{ taskId: string; status: string; ppsrNo: string }> {
  const response = await api.get(`/api/ppsr/reports/${reportId}/pdf/`);
  return {
    taskId: response.data.taskId || response.data.task_id,
    status: response.data.status,
    ppsrNo: response.data.ppsrNo || response.data.ppsr_no,
  };
}

/**
 * Poll the async status of the PDF export generation.
 */
export async function getPpsrPdfStatus(reportId: string, taskId?: string): Promise<{ ready: boolean; fileReady: boolean; state: string; ppsrNo: string }> {
  const params = taskId ? { task_id: taskId } : {};
  const response = await api.get(`/api/ppsr/reports/${reportId}/pdf/status/`, { params });
  return {
    ready: response.data.ready,
    fileReady: response.data.fileReady || response.data.file_ready,
    state: response.data.state || response.data.status,
    ppsrNo: response.data.ppsrNo || response.data.ppsr_no,
  };
}

/**
 * Return direct streaming URL for downloading the generated PDF.
 */
export function getPpsrPdfDownloadUrl(reportId: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/ppsr/reports/${reportId}/pdf/download/`;
}

/**
 * Fetch and download PDF as a binary Blob in the browser.
 */
export async function downloadPpsrPdfBlob(reportId: string, ppsrNo: string): Promise<void> {
  const response = await api.get(`/api/ppsr/reports/${reportId}/pdf/download/`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `PPSR_Report_${ppsrNo}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

