import { AuthUser } from '../types';

const USER_STORAGE_KEY = 'dugsi_user';
const LEGACY_STORAGE_KEY = 'dugsiga_auth';
const TOKEN_STORAGE_KEY = 'dugsi_token';

export function getStoredSession(): AuthUser | null {
  try {
    const raw =
      localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function getAuthToken(): string {
  try {
    const directToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (directToken) return directToken;
    const session = getStoredSession();
    return session?.token || '';
  } catch {
    return '';
  }
}

export function saveAuthSession(user: AuthUser, token?: string): void {
  try {
    const payload = token ? { ...user, token } : user;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
