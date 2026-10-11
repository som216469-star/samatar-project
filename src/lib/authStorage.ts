import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { AuthUser } from '../types';

const USER_STORAGE_KEY = 'dugsi_user';
const LEGACY_STORAGE_KEY = 'dugsiga_auth';
const NATIVE_TOKEN_KEY = 'dugsi_access_token';

// Web uses the HttpOnly cookie. Native apps keep bearer tokens only in memory
// and the operating system's secure storage, never in localStorage.
let memoryToken = '';

export async function restoreAuthToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    memoryToken = (await SecureStorage.getItem(NATIVE_TOKEN_KEY)) || '';
  } catch {
    memoryToken = '';
  }
}

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
  return memoryToken;
}

export function saveAuthSession(user: AuthUser, token?: string): void {
  try {
    if (token) {
      memoryToken = token;
      if (Capacitor.isNativePlatform()) {
        void SecureStorage.setItem(NATIVE_TOKEN_KEY, token).catch(() => {
          // Keep the token in memory for this session if native persistence fails.
        });
      }
    }

    const { token: _ignoredToken, ...safeUser } = user as AuthUser & { token?: string };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(safeUser));
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  memoryToken = '';
  if (Capacitor.isNativePlatform()) {
    void SecureStorage.removeItem(NATIVE_TOKEN_KEY).catch(() => undefined);
  }

  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
