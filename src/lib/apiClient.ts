import { enqueueOfflineAction } from '../utils/offlineSync';
import { getStoredSession, getAuthToken } from './authStorage';

/**
 * Centralized Institutional API Client.
 * The preferred browser credential is the server-issued HttpOnly session cookie.
 * Authorization is only attached when a short-lived in-memory compatibility token exists.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const session = getStoredSession();
  const schoolEmail = session?.schoolId || session?.email || '';
  const token = getAuthToken();

  const headers = new Headers(init?.headers);
  if (schoolEmail) headers.set('X-School-Email', schoolEmail);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return window.fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin'
  });
}

export async function apiJson<T = any>(
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
  }
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const method = options?.method || 'GET';
  const init: RequestInit = { method };

  if (options?.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }

  const res = await apiFetch(url, init);
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (res.ok) {
    return { ok: true, status: res.status, data: payload as T };
  }

  return {
    ok: false,
    status: res.status,
    data: null,
    error: payload?.error || payload?.message || `Request failed (${res.status})`
  };
}

export { enqueueOfflineAction };
