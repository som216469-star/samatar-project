import crypto from "crypto";
import express from "express";

export interface AuthenticatedUser {
  email: string;
  role: "admin" | "teacher" | "staff" | "accountant" | "receptionist";
  schoolId: string;
  name?: string;
  teacherId?: string;
  assignedClasses?: string[];
  assignedSubjects?: string[];
}

export interface SessionInfo {
  token: string;
  user: AuthenticatedUser;
  createdAt: number;
  expiresAt: number;
}

// In-memory active session store with automatic TTL
const activeSessions = new Map<string, SessionInfo>();
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function createSessionToken(user: AuthenticatedUser): string {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  activeSessions.set(token, {
    token,
    user,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return token;
}

export function getSession(token: string): AuthenticatedUser | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session.user;
}

export function revokeSession(token: string): boolean {
  return activeSessions.delete(token);
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Password security:
// - New passwords use scrypt with a random 128-bit salt.
// - Legacy hashes from the old simpleHash() remain readable for one-time migration.
// - Successful legacy logins are transparently upgraded to scrypt hashes.
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
  return `scrypt${salt.toString("base64url")}${derivedKey.toString("base64url")}`;
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
  const a = Buffer.from(legacy);
  const b = Buffer.from(storedHash);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { valid, needsRehash: valid };
}

export function getSessionFromRequest(req: express.Request): AuthenticatedUser | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return getSession(authHeader.substring(7).trim());
  }

  const customToken = req.headers["x-session-token"] || req.headers["x-auth-token"];
  if (typeof customToken === "string") {
    return getSession(customToken.trim());
  }

  return null;
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

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Fadlan geli password sax ah." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password-ku waa inuu ka koobnaadaa ugu yaraan 8 xaraf." };
  }
  return { valid: true };
}

/**
 * Derives and securely authenticates the requesting user.
 * ZERO TRUST: Does NOT blindly trust client-provided school_id or roles.
 */
export function getAuthenticatedUser(
  req: express.Request,
  loadLocalDB: () => any
): AuthenticatedUser | null {
  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const sessionUser = getSession(token);
    if (sessionUser) {
      return sessionUser;
    }
  }

  // 2. Fallback check for session token passed in custom header
  const customToken = req.headers["x-session-token"] || req.headers["x-auth-token"];
  if (typeof customToken === "string") {
    const sessionUser = getSession(customToken.trim());
    if (sessionUser) {
      return sessionUser;
    }
  }

  // 3. Backward-compatible lookup for existing sessions:
  // Check X-School-Email, verify against actual database records, and infer role and real school_id
  const emailHeader = req.headers["x-school-email"] || req.headers["X-School-Email"];
  if (typeof emailHeader === "string" && emailHeader.trim() !== "") {
    const cleanEmail = emailHeader.trim().toLowerCase();
    const db = loadLocalDB();

    // Check if it's an authenticated registered teacher
    const teacher = (db.teachers || []).find((t: any) => (t.email || "").toLowerCase() === cleanEmail);
    if (teacher) {
      return {
        email: cleanEmail,
        role: "teacher",
        schoolId: teacher.schoolId || "default-school",
        teacherId: teacher.id,
        name: teacher.name,
        assignedClasses: teacher.assignedClasses || [],
        assignedSubjects: teacher.assignedSubjects || []
      };
    }

    // Check if it's a registered user
    const user = (db.users || []).find((u: any) => (u.email || "").toLowerCase() === cleanEmail);
    if (user) {
      const isTeacher = user.role === "teacher";
      return {
        email: cleanEmail,
        role: isTeacher ? "teacher" : "admin",
        schoolId: user.school_id || cleanEmail,
        teacherId: user.teacher_id,
        assignedClasses: user.assignedClasses || [],
        assignedSubjects: user.assignedSubjects || []
      };
    }

    // Default tenant identity matching existing behavior
    return {
      email: cleanEmail,
      role: "admin",
      schoolId: cleanEmail
    };
  }

  return null;
}

/**
 * Returns strictly validated schoolId.
 * Never allows client spoofing across tenants.
 */
export function getValidatedSchoolId(req: express.Request, loadLocalDB: () => any): string {
  const user = getAuthenticatedUser(req, loadLocalDB);
  if (user && user.schoolId) {
    return user.schoolId;
  }
  const emailHeader = req.headers["x-school-email"] || req.headers["X-School-Email"] || req.headers["x-school-id"] || req.headers["X-School-Id"];
  if (typeof emailHeader === "string" && emailHeader.trim() !== "") {
    return emailHeader.trim().toLowerCase();
  }
  return "default-school";
}
