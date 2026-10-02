import { AuthUser } from '../types';

const USER_STORAGE_KEY = 'dugsi_user';
const LEGACY_STORAGE_KEY = 'dugsiga_auth';

// Auth tokens are intentionally NOT persisted in localStorage.
// Browser sessions use the server-issued HttpOnly cookie instead.
let memoryToken = '';

export function getStoredSession(): AuthUser | null {
  try {
    const raw =
      localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { token: _legacyToken, ...safeUser } = parsed as Record<string, unknown>;
    return safeUser as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function getAuthToken(): string {
  // Kept only for short-lived compatibility with code that already calls this.
  // The preferred credential is the HttpOnly session cookie.
  return memoryToken;
}

export function saveAuthSession(user: AuthUser, token?: string): void {
  try {
    if (token) memoryToken = token;

    const { token: _ignoredToken, ...safeUser } = user as AuthUser & { token?: string };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(safeUser));
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  memoryToken = '';
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
