import { enqueueOfflineAction } from '../utils/offlineSync';

/**
 * Centralized Institutional API Client
 * Automatically attaches tenant X-School-Email and Bearer JWT token from local session.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const userStr = localStorage.getItem('dugsiga_auth');
  let schoolEmail = '';
  let token = '';
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u && u.email) schoolEmail = u.email;
      if (u && u.token) token = u.token;
    } catch {
      // Ignore malformed JSON in localStorage
    }
  }

  const headers = new Headers(init?.headers);
  if (schoolEmail) headers.set('X-School-Email', schoolEmail);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return window.fetch(input, {
    ...init,
    headers
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
