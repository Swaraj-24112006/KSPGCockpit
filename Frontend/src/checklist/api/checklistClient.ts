/**
 * checklistClient.ts — Authenticated API client for the Checklist Backend
 * ========================================================================
 * Routes all requests through the Vite proxy → /api/v1/checklist/* → port 8001
 * Uses the shared JWT token stored by the Cockpit login system.
 */

const API_BASE = import.meta.env.VITE_CHECKLIST_API_URL || '/api/v1/checklist';

function getAuthHeaders(): Record<string, string> {
  const token =
    sessionStorage.getItem('kspg_access_token') ||
    localStorage.getItem('kspg_access_token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function checklistFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('kspg:unauthorized'));
  }

  return response;
}

export { API_BASE };
