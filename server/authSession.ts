import crypto from "crypto";
import express from "express";

export interface AuthenticatedUser {
  email: string;
  role: string;
  schoolId: string;
  name?: string;
  teacherId?: string;
  assignedClasses?: string[];
  assignedSubjects?: string[];
}

export interface SessionPayload {
  v: 1;
  iat: number;
  exp: number;
  jti: string;
  user: AuthenticatedUser;
}

// Short-lived stateless signed sessions work across Cloud Run instances/restarts.
// Use a dedicated SESSION_SECRET in production; SUPABASE_SECRET_KEY is only a fallback
// so existing deployments continue to work until SESSION_SECRET is configured.
const rawSessionSecret =
  (process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY || "").trim();

if (!rawSessionSecret) {
  console.warn(
    "SECURITY WARNING: SESSION_SECRET is not configured. Sessions will be tied to this server process and invalidate on restart."
  );
}

const SESSION_SECRET = rawSessionSecret
  ? crypto.createHash("sha256").update(rawSessionSecret, "utf8").digest()
  : crypto.randomBytes(32);

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const revokedSessions = new Map<string, number>();

function cleanupRevocations() {
  const now = Date.now();
  for (const [token, expiresAt] of revokedSessions) {
    if (expiresAt <= now) revokedSessions.delete(token);
  }
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signSessionPayload(payloadSegment: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadSegment, "utf8")
    .digest("base64url");
}

export function createSessionToken(user: AuthenticatedUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: 1,
    iat: now,
    exp: now + Math.floor(SESSION_TTL_MS / 1000),
    jti: crypto.randomBytes(16).toString("hex"),
    user
  };

  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = signSessionPayload(payloadSegment);
  return `s1.${payloadSegment}.${signature}`;
}

export function getSession(token: string): AuthenticatedUser | null {
  if (!token || token.length > 8192) return null;

  cleanupRevocations();
  if (revokedSessions.has(token)) return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "s1") return null;

  const [, payloadSegment, signature] = parts;
  if (!payloadSegment || !signature) return null;

  try {
    const expectedSignature = signSessionPayload(payloadSegment);
    const expected = Buffer.from(expectedSignature, "base64url");
    const provided = Buffer.from(signature, "base64url");
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;

    const now = Math.floor(Date.now() / 1000);
    if (
      payload.v !== 1 ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      !payload.jti ||
      payload.exp <= now ||
      payload.iat > now + 60 ||
      !payload.user ||
      typeof payload.user.email !== "string" ||
      typeof payload.user.schoolId !== "string" ||
      typeof payload.user.role !== "string"
    ) {
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
}

export function revokeSession(token: string): boolean {
  if (!token) return false;
  const session = getSession(token);
  if (!session) return false;

  const parts = token.split(".");
  let expiresAt = Date.now() + SESSION_TTL_MS;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as SessionPayload;
    expiresAt = payload.exp * 1000;
  } catch {
    // Keep the conservative fallback TTL.
  }

  revokedSessions.set(token, expiresAt);
  return true;
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Password security:
// - New passwords use scrypt with a random 128-bit salt.
// - Legacy simpleHash hashes remain readable for one-time migration.
// - Successful legacy logins are transparently upgraded to scrypt.
export function legacyPasswordHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { valid: false, needsRehash: false };

  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return { valid: false, needsRehash: false };

    try {
      const salt = Buffer.from(parts[1], "base64url");
      const expected = Buffer.from(parts[2], "base64url");
      if (salt.length !== 16 || expected.length !== 64) {
        return { valid: false, needsRehash: false };
      }

      const actual = await scryptAsync(password, salt);
      const valid =
        expected.length === actual.length &&
        crypto.timingSafeEqual(expected, actual);
      return { valid, needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  const legacy = legacyPasswordHash(password);
  const a = Buffer.from(legacy, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { valid, needsRehash: valid };
}

const SESSION_COOKIE_NAME = "dugsi_session";

function getSessionCookie(req: express.Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function getSessionTokenFromRequest(
  req: express.Request
): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  const customToken =
    req.headers["x-session-token"] || req.headers["x-auth-token"];
  if (typeof customToken === "string" && customToken.trim()) {
    return customToken.trim();
  }

  // Preferred browser session: HttpOnly SameSite cookie.
  return getSessionCookie(req);
}

export function getSessionFromRequest(
  req: express.Request
): AuthenticatedUser | null {
  const token = getSessionTokenFromRequest(req);
  return token ? getSession(token) : null;
}

export function requireAuthenticatedRequest(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!getSessionFromRequest(req)) {
    res.status(401).json({
      error: "Unauthorized. Fadlan marka hore gal akoonkaaga."
    });
    return;
  }
  next();
}

export function validatePassword(
  password: string
): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Fadlan geli password sax ah." };
  }

  if (password.length < 10) {
    return {
      valid: false,
      error: "Password-ku waa inuu ka koobnaadaa ugu yaraan 10 xaraf."
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password-ku kama badnaan karo 128 xaraf."
    };
  }

  return { valid: true };
}

/**
 * Strict zero-trust user resolution.
 * The client never gets to choose school_id, role, or identity through a header.
 */
export function getAuthenticatedUser(
  req: express.Request,
  _loadLocalDB?: () => any
): AuthenticatedUser | null {
  return getSessionFromRequest(req);
}

/**
 * Returns the school identity bound to the verified signed session.
 */
export function getValidatedSchoolId(
  req: express.Request,
  _loadLocalDB?: () => any
): string {
  return getAuthenticatedUser(req)?.schoolId || "";
}
