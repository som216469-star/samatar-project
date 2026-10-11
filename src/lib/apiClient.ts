import { enqueueOfflineAction } from '../utils/offlineSync';
import { getAuthToken } from './authStorage';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const MOBILE_BUILD = import.meta.env.MODE === 'mobile';

function resolveRequest(input: RequestInfo | URL): { input: RequestInfo | URL; isApiRequest: boolean } {
  if (!MOBILE_BUILD || !API_BASE_URL) return { input, isApiRequest: false };

  const rawUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, window.location.origin);
  } catch {
    return { input, isApiRequest: false };
  }

  // Only route this app's API calls to the shared Render backend; never rewrite asset/external URLs.
  if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/api/')) {
    return { input, isApiRequest: false };
  }

  const apiUrl = new URL(API_BASE_URL);
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, '')}${parsed.pathname}`;
  apiUrl.search = parsed.search;
  apiUrl.hash = parsed.hash;
  return { input: apiUrl, isApiRequest: true };
}

/**
 * Browser requests use the HttpOnly same-origin session cookie.
 * The Capacitor build calls the existing Render API and uses a short-lived
 * bearer session token stored in native Keychain/Android Keystore storage.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolved = resolveRequest(input);
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (MOBILE_BUILD && resolved.isApiRequest) headers.set('X-Dugsi-Client', 'capacitor');

  return window.fetch(resolved.input, {
    ...init,
    headers,
    credentials: MOBILE_BUILD && resolved.isApiRequest ? 'omit' : 'same-origin'
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
