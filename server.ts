import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { withSupabase, createSupabaseContext } from "@supabase/server";
import { registerModernRoutes } from "./server/modernRoutes.ts";
import { registerFinanceRoutes } from "./server/financeRoutes.ts";
import {
  getAuthenticatedUser,
  createSessionToken,
  hashPassword,
  verifyPassword,
  requireAuthenticatedRequest,
  getSessionTokenFromRequest,
  revokeSession,
  validatePassword
} from "./server/authSession.ts";

// Load environment variables
dotenv.config({ override: true });

// Normalize/Clean all Supabase-related environment variables for both SDKs
const envKeysToClean = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_JWKS_URL"
];
for (const key of envKeysToClean) {
  if (process.env[key]) {
    let val = process.env[key]!.trim();
    while ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).trim();
    }
    process.env[key] = val;
  }
}

// Normalize short/bare project IDs for SUPABASE_URL if necessary
if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith("http")) {
  if (!process.env.SUPABASE_URL.includes(".") && !process.env.SUPABASE_URL.includes("/")) {
    process.env.SUPABASE_URL = `https://${process.env.SUPABASE_URL}.supabase.co`;
  } else {
    process.env.SUPABASE_URL = `https://${process.env.SUPABASE_URL}`;
  }
}

function sanitizeEnvValue(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function parseSupabaseUrl(url: string | undefined): string {
  let clean = sanitizeEnvValue(url);
  if (!clean) return "";
  let isSecure = true;
  if (clean.toLowerCase().startsWith("https://")) {
    clean = clean.slice(8);
  } else if (clean.toLowerCase().startsWith("http://")) {
    clean = clean.slice(7);
    isSecure = false;
  }
  const slashIdx = clean.indexOf("/");
  if (slashIdx !== -1) {
    clean = clean.slice(0, slashIdx);
  }
  if (clean && !clean.includes(".")) {
    clean = clean + ".supabase.co";
  }
  return (isSecure ? "https://" : "http://") + clean;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Reverse-proxy aware and hardened Express defaults.
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security headers that are safe for this SPA without introducing a brittle CSP.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  if (req.secure || forwardedProto === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Basic in-process abuse controls for public authentication endpoints.
// These limits protect each runtime instance and complement the signed session design.
type RateBucket = { count: number; resetAt: number };
const authRateBuckets = new Map<string, RateBucket>();

function consumeAuthRateLimit(key: string, maxAttempts: number, windowMs: number): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const current = authRateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    authRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  current.count += 1;
  if (current.count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

function clearAuthRateLimit(keyPrefix: string) {
  for (const key of authRateBuckets.keys()) {
    if (key.startsWith(keyPrefix)) authRateBuckets.delete(key);
  }
}

const SESSION_COOKIE_NAME = "dugsi_session";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function requestIsHttps(req: express.Request): boolean {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return req.secure || forwardedProto === "https";
}

function setSessionCookie(req: express.Request, res: express.Response, token: string) {
  const secure = requestIsHttps(req);
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ];

  if (secure) attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(req: express.Request, res: express.Response) {
  const secure = requestIsHttps(req);
  const attributes = [
    `${SESSION_COOKIE_NAME}=;`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0"
  ];

  if (secure) attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

// Reject cross-site state-changing API requests. Bearer auth is the primary control,
// while this adds defense-in-depth against browser-based request forgery.
function apiOriginAllowed(req: express.Request): boolean {
  if (!req.headers.origin) return true;

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const requestOrigin = forwardedHost
    ? `${forwardedProto || (req.secure ? "https" : "http")}://${forwardedHost}`
    : "";

  let configuredOrigin = "";
  try {
    if (process.env.APP_URL) configuredOrigin = new URL(process.env.APP_URL).origin;
  } catch {}

  return req.headers.origin === requestOrigin ||
    (!!configuredOrigin && req.headers.origin === configuredOrigin);
}

app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !apiOriginAllowed(req)) {
    return res.status(403).json({ error: "Cross-site request blocked." });
  }
  next();
});

app.use("/api", (req, res, next) => {
  const pathName = req.path;

  if (req.method === "POST" && pathName === "/auth/login") {
    const ip = req.ip || "unknown";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "unknown";
    const ipLimit = consumeAuthRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
    const accountLimit = consumeAuthRateLimit(`login:account:${ip}:${email}`, 6, 15 * 60 * 1000);

    if (!ipLimit.allowed || !accountLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds);
      res.setHeader("Retry-After", String(retry));
      return res.status(429).json({
        error: "Too many login attempts. Fadlan sug wax yar kadibna mar kale isku day."
      });
    }
  }

  if (req.method === "POST" && pathName === "/auth/signup") {
    const ip = req.ip || "unknown";
    const limit = consumeAuthRateLimit(`signup:ip:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({
        error: "Diiwaangelin badan ayaa laga helay cinwaankan. Fadlan sug wax yar."
      });
    }
  }

  if (req.method === "POST" && pathName === "/teachers/activate-account") {
    const ip = req.ip || "unknown";
    const limit = consumeAuthRateLimit(`activation:ip:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({
        error: "Codsiyo badan ayaa laga helay cinwaankan. Fadlan sug wax yar."
      });
    }
  }

  return next();
});

// Initialize Supabase Client with resilient key resolution
function deriveSupabaseKey(): string {
  const secretKey = sanitizeEnvValue(process.env.SUPABASE_SECRET_KEY || "");
  const anonKey = sanitizeEnvValue(
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || ""
  );

  // Never derive a privileged Supabase key from a JWKS URL.
  // A JWKS URL is public metadata, not a signing secret.
  if (secretKey && !secretKey.startsWith("sb_publish")) {
    return secretKey;
  }

  return anonKey;
}

const supabaseUrl = parseSupabaseUrl(process.env.SUPABASE_URL || "https://mdvfcqujqjnvfpzowayo.supabase.co");
const supabaseAnonKey = sanitizeEnvValue(process.env.SUPABASE_ANON_KEY || "");
const supabaseSecretKey = sanitizeEnvValue(process.env.SUPABASE_SECRET_KEY || "");
const supabaseActiveKey = deriveSupabaseKey();

let supabase: any = null;
try {
  if (supabaseUrl && supabaseActiveKey) {
    supabase = createClient(supabaseUrl, supabaseActiveKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
}

// ✅ NO EMAIL VERIFICATION - Auto verified

// Local database fallback with read-only filesystem resilience for Cloud Run
const PRIMARY_DB_PATH = path.join(process.cwd(), "database.json");
const TMP_DB_PATH = path.join("/tmp", "dugsi_database.json");
let inMemoryDB: LocalDB | null = null;

interface LocalDB {
  users: Array<{ email: string; password_hash: string; verified: boolean; verification_code?: string; role?: string }>;
  students: Array<any>;
  attendance: Array<{ schoolId?: string; date: string; studentId: string; status: string; timestamp: string; sessionType?: string }>;
  fees: Array<any>;
  classes: Array<{ id: string; schoolId?: string; className: string; teacherName: string; roomNumber: string; description: string; createdAt: string; section?: string; capacity?: number; academicYear?: string; status?: string }>;
  subjects: Array<{ id: string; schoolId?: string; subjectName: string; subjectCode: string; className: string; teacherName: string; createdAt: string; category?: string; description?: string; passMarks?: number; maxMarks?: number; status?: string }>;
  examScores: Array<{ id: string; schoolId?: string; studentId: string; studentName: string; className: string; subjectName: string; examName: string; term: string; maxMarks: number; marksObtained: number; grade: string; examDate: string; createdAt: string }>;
  settings: any;
  teachers?: Array<any>;
  staff?: Array<any>;
  guardians?: Array<any>;
  staffAttendance?: Array<any>;
  timetable?: Array<any>;
  admissions?: Array<any>;
  announcements?: Array<any>;
  libraryBooks?: Array<any>;
  libraryLoans?: Array<any>;
  inventory?: Array<any>;
  documents?: Array<any>;
  notifications?: Array<any>;
  feeStructures?: Array<any>;
  invoices?: Array<any>;
  payments?: Array<any>;
  expenses?: Array<any>;
  income?: Array<any>;
  budgets?: Array<any>;
  payroll?: Array<any>;
}

const defaultSettings = {
  schoolName: "Dugsiga Pro 2026",
  currency: "USD",
  feeAmount: 50,
  systemTheme: "light"
};

function loadLocalDB(): LocalDB {
  const ensureArrays = (db: any): LocalDB => {
    if (!db.users) db.users = [];
    if (!db.students) db.students = [];
    if (!db.attendance) db.attendance = [];
    if (!db.fees) db.fees = [];
    if (!db.classes) db.classes = [];
    if (!db.subjects) db.subjects = [];
    if (!db.examScores) db.examScores = [];
    if (!db.settings) db.settings = defaultSettings;
    if (!db.teachers) db.teachers = [];
    if (!db.staff) db.staff = [];
    if (!db.guardians) db.guardians = [];
    if (!db.staffAttendance) db.staffAttendance = [];
    if (!db.timetable) db.timetable = [];
    if (!db.admissions) db.admissions = [];
    if (!db.announcements) db.announcements = [];
    if (!db.libraryBooks) db.libraryBooks = [];
    if (!db.libraryLoans) db.libraryLoans = [];
    if (!db.inventory) db.inventory = [];
    if (!db.documents) db.documents = [];
    if (!db.notifications) db.notifications = [];
    if (!db.feeStructures) db.feeStructures = [];
    if (!db.invoices) db.invoices = [];
    if (!db.payments) db.payments = [];
    if (!db.expenses) db.expenses = [];
    if (!db.income) db.income = [];
    if (!db.budgets) db.budgets = [];
    if (!db.payroll) db.payroll = [];
    return db;
  };

  const candidatePaths = [PRIMARY_DB_PATH, TMP_DB_PATH];
  for (const dbPath of candidatePaths) {
    try {
      if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, "utf-8");
        const parsed = JSON.parse(content);
        inMemoryDB = ensureArrays(parsed);
        return inMemoryDB;
      }
    } catch (e) {
      console.warn(`Failed to read local DB at ${dbPath}:`, e);
    }
  }

  if (inMemoryDB) {
    return ensureArrays(inMemoryDB);
  }

  const initial = ensureArrays({ settings: defaultSettings });
  inMemoryDB = initial;
  saveLocalDB(initial);
  return initial;
}

function saveLocalDB(data: LocalDB) {
  inMemoryDB = data;
  try {
    fs.writeFileSync(PRIMARY_DB_PATH, JSON.stringify(data, null, 2));
    return;
  } catch {
    try {
      fs.writeFileSync(TMP_DB_PATH, JSON.stringify(data, null, 2));
    } catch (tmpErr) {
      console.warn("Notice: operating with in-memory DB storage:", tmpErr);
    }
  }
}

function getSchoolId(req: express.Request): string {
  // ZERO TRUST TENANCY: tenant identity must come only from the verified server session.
  // Never accept a client-controlled school header or fallback tenant.
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  return authUser?.schoolId?.trim() || "";
}

function buildAuthResponse(cleanEmail: string, db: any) {
  // Check if user is a teacher
  const teacher = (db.teachers || []).find((t: any) => (t.email || "").toLowerCase() === cleanEmail);
  if (teacher) {
    if (teacher.status === "DEACTIVATED") {
      return { error: "Akoonkaaga macallinka waa la hakiyey (Account deactivated). Fadlan la xiriir maamulka iskuulka." };
    }
    if (teacher.status === "INVITED") {
      return { error: "Akoonkan weli lama dhaqaajin. Fadlan isticmaal link-gii casuumaadda ee email-kaaga laguugu soo diray si aad u samaysato password." };
    }
    teacher.lastLoginAt = new Date().toISOString();
    const userPayload: any = {
      email: cleanEmail,
      role: "teacher",
      name: teacher.name,
      teacherId: teacher.id,
      schoolId: teacher.schoolId || cleanEmail,
      assignedClasses: teacher.assignedClasses || [],
      assignedSubjects: teacher.assignedSubjects || []
    };
    const token = createSessionToken(userPayload);
    return {
      success: true,
      token,
      user: userPayload
    };
  }

  // Otherwise school administrator
  const userRecord = (db.users || []).find((u: any) => (u.email || "").toLowerCase() === cleanEmail);
  const userPayload: any = {
    email: cleanEmail,
    role: userRecord?.role || "admin",
    schoolId: userRecord?.school_id || cleanEmail
  };
  const token = createSessionToken(userPayload);
  return {
    success: true,
    token,
    user: userPayload
  };
}

async function testSupabaseTable(tableName: string, checkColumn?: string): Promise<boolean> {
  if (!supabaseActiveKey || !supabase) return false;
  try {
    const selectStr = checkColumn ? checkColumn : "*";
    const { error } = await supabase.from(tableName).select(selectStr).limit(1);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

let useLocalFallback = false;
let customSupabaseActive = false;

function handleSupabaseError(res: any, error: any, context: string) {
  console.warn(`Backend database notice during "${context}":`, error?.message || error);
  return res.status(500).json({
    error: error?.message || "Khalad ayaa dhacay inta hawsha lagu jiray. Fadlan dib iskugu day."
  });
}

async function syncLocalToSupabase() {
  if (!supabase || useLocalFallback) return;
  try {
    const db = loadLocalDB();
    // 1. Sync any local users missing from Supabase
    if (db.users && db.users.length > 0) {
      const { data: sbUsers } = await supabase.from("dugsiga_users").select("email");
      const existingEmails = new Set((sbUsers || []).map((u: any) => u.email.toLowerCase()));
      for (const u of db.users) {
        if (!existingEmails.has(u.email.toLowerCase())) {
          console.log("Syncing local user to Supabase:", u.email);
          await supabase.from("dugsiga_users").insert([{
            email: u.email.toLowerCase(),
            password: u.password_hash,
            verified: true
          }]);
        }
      }
    }

    // 2. Sync any local classes missing from Supabase
    if (db.classes && db.classes.length > 0) {
      const { data: sbClasses } = await supabase.from("dugsiga_classes").select("school_id, class_name");
      const existingClasses = new Set((sbClasses || []).map((c: any) => `${c.school_id}::${c.class_name.toLowerCase()}`));
      for (const c of db.classes) {
        const key = `${c.schoolId || "default-school"}::${c.className.toLowerCase()}`;
        if (!existingClasses.has(key)) {
          console.log("Syncing local class to Supabase:", c.className);
          await supabase.from("dugsiga_classes").insert([{
            id: c.id || 'cls-' + Math.random().toString(36).substring(2, 11),
            school_id: c.schoolId || "default-school",
            class_name: c.className,
            teacher_name: c.teacherName || "",
            room_number: c.roomNumber || "",
            description: c.description || "",
            created_at: c.createdAt || new Date().toISOString().split("T")[0]
          }]);
        }
      }
    }
  } catch (syncErr) {
    console.warn("Notice during local DB to Supabase sync:", syncErr);
  }
}

async function checkSupabaseStatus() {
  if (!supabaseUrl || !supabaseActiveKey || !supabase) {
    useLocalFallback = true;
    customSupabaseActive = false;
    console.log("Supabase not fully configured. Using local database fallback.");
    return;
  }
  try {
    const studentsExist = await testSupabaseTable("dugsiga_students", "school_id");
    const attendanceExists = await testSupabaseTable("dugsiga_attendance", "school_id");
    const classesExist = await testSupabaseTable("dugsiga_classes", "school_id");
    const subjectsExist = await testSupabaseTable("dugsiga_subjects", "school_id");
    const examsExist = await testSupabaseTable("dugsiga_exam_scores", "school_id");
    const feesExist = await testSupabaseTable("dugsiga_fees", "school_id");
    const settingsExist = await testSupabaseTable("dugsiga_settings", "school_id");
    const usersExist = await testSupabaseTable("dugsiga_users", "email");
    
    if (!studentsExist || !attendanceExists || !classesExist || !subjectsExist || !examsExist || !feesExist || !settingsExist || !usersExist) {
      useLocalFallback = true;
      customSupabaseActive = false;
      console.log("Supabase tables missing, outdated, or incomplete. Operating in local database mode.");
      return;
    }

    // Ping check: verify read and write capability
    const pingKey = `_ping_${Date.now()}`;
    const { error: writeError } = await supabase
      .from("dugsiga_settings")
      .upsert({ school_id: "__health_check__", key: pingKey, value: { ping: true } });

    if (writeError) {
      useLocalFallback = true;
      customSupabaseActive = false;
      console.warn(`Supabase RLS or write permission issue (${writeError.code}: ${writeError.message}). Operating in resilient local database mode.`);
      return;
    }

    // Clean up ping record
    await supabase.from("dugsiga_settings").delete().eq("school_id", "__health_check__").eq("key", pingKey);

    useLocalFallback = false;
    customSupabaseActive = true;
    console.log("✅ Supabase si buuxda ayuu ugu xiran yahay (Direct Supabase Cloud Mode Active).");

    // Perform background data sync so no local changes are lost
    await syncLocalToSupabase();
  } catch (err: any) {
    useLocalFallback = true;
    customSupabaseActive = false;
    console.log("Error checking Supabase, operating in resilient local database mode:", err?.message || err);
  }
}

checkSupabaseStatus();

const SQL_SETUP_SCRIPT = `
-- =========================================================================
-- DUGSI PRO 2026 — PRODUCTION SAFE NON-DESTRUCTIVE DATABASE SETUP
-- Safely creates all core and modernized tables without dropping any data
-- =========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS dugsiga_users (
  id BIGSERIAL UNIQUE,
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  verified BOOLEAN DEFAULT TRUE,
  role TEXT DEFAULT 'School Admin',
  school_id TEXT,
  teacher_id TEXT,
  verification_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS dugsiga_students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT,
  guardian_phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  photo TEXT,
  date_of_birth TEXT,
  address TEXT,
  guardian_name TEXT,
  section TEXT,
  roll_number TEXT
);

-- 3. Classes Table
CREATE TABLE IF NOT EXISTS dugsiga_classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  teacher_name TEXT,
  room_number TEXT,
  description TEXT,
  section TEXT,
  capacity INTEGER,
  academic_year TEXT,
  created_at TEXT
);

-- 4. Subjects Table
CREATE TABLE IF NOT EXISTS dugsiga_subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  class_name TEXT,
  teacher_name TEXT,
  category TEXT,
  description TEXT,
  pass_marks NUMERIC DEFAULT 50,
  max_marks NUMERIC DEFAULT 100,
  created_at TEXT
);

-- 5. Exam Scores Table
CREATE TABLE IF NOT EXISTS dugsiga_exam_scores (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  class_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  term TEXT,
  max_marks NUMERIC DEFAULT 100,
  marks_obtained NUMERIC NOT NULL,
  grade TEXT,
  exam_date TEXT,
  created_at TEXT
);

-- 6. Student Attendance Table
CREATE TABLE IF NOT EXISTS dugsiga_attendance (
  school_id TEXT NOT NULL,
  date TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT,
  session_type TEXT DEFAULT 'before_break',
  PRIMARY KEY (school_id, date, student_id, session_type)
);

-- 7. Fees Table
CREATE TABLE IF NOT EXISTS dugsiga_fees (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  history JSONB
);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS dugsiga_settings (
  school_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  PRIMARY KEY (school_id, key)
);

-- 9. Teachers Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_teachers (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  teacher_id TEXT,
  name TEXT NOT NULL,
  photo TEXT,
  gender TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  qualification TEXT,
  specialization TEXT,
  hire_date TEXT,
  employment_status TEXT DEFAULT 'Full-Time',
  salary NUMERIC DEFAULT 0,
  emergency_contact TEXT,
  notes TEXT,
  assigned_classes JSONB,
  assigned_subjects JSONB,
  created_at TEXT
);

-- 10. Staff Members Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_staff (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  employee_id TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  hire_date TEXT,
  salary NUMERIC DEFAULT 0,
  employment_status TEXT DEFAULT 'Full-Time',
  notes TEXT,
  created_at TEXT
);

-- 11. Guardians Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_guardians (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  guardian_id TEXT,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  emergency_contact TEXT,
  student_ids JSONB,
  notes TEXT,
  created_at TEXT
);

-- 12. Staff Attendance Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_staff_attendance (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  role TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT,
  notes TEXT
);

-- 13. Timetable Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_timetable (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year TEXT,
  term TEXT,
  class_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  room_number TEXT,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- 14. Admissions Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_admissions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  desired_class TEXT NOT NULL,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  admission_date TEXT,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  student_id TEXT,
  created_at TEXT
);

-- 15. Announcements Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_announcements (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT DEFAULT 'Everyone',
  target_class TEXT,
  author TEXT,
  priority TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'Active',
  publish_date TEXT,
  expiry_date TEXT,
  created_at TEXT
);

-- 16. Library Books Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_library_books (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  isbn TEXT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  location TEXT,
  created_at TEXT
);

-- 17. Library Loans Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_library_loans (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  book_title TEXT,
  borrower_type TEXT NOT NULL,
  borrower_id TEXT NOT NULL,
  borrower_name TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  return_date TEXT,
  status TEXT DEFAULT 'Borrowed'
);

-- 18. Inventory Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_inventory (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  location TEXT,
  condition TEXT DEFAULT 'Good',
  purchase_date TEXT,
  purchase_cost NUMERIC DEFAULT 0,
  assigned_to TEXT,
  status TEXT DEFAULT 'Available',
  notes TEXT
);

-- 19. Documents Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_documents (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  related_id TEXT,
  related_name TEXT,
  file_type TEXT,
  file_size TEXT,
  file_url TEXT,
  upload_date TEXT,
  notes TEXT
);

-- 20. Notifications Table (Extension)
CREATE TABLE IF NOT EXISTS dugsiga_notifications (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT DEFAULT 'Sent',
  created_at TEXT
);

-- 21. Fee Structures Table
CREATE TABLE IF NOT EXISTS dugsiga_fee_structures (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  class_name TEXT DEFAULT 'All Classes',
  academic_year TEXT DEFAULT '2026-2027',
  term TEXT DEFAULT 'All Terms',
  description TEXT,
  created_at TEXT
);

-- 22. Invoices Table
CREATE TABLE IF NOT EXISTS dugsiga_invoices (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  class_name TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unpaid',
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 23. Payments Table
CREATE TABLE IF NOT EXISTS dugsiga_payments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  invoice_id TEXT,
  invoice_number TEXT,
  student_id TEXT,
  student_name TEXT,
  class_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  remaining_balance NUMERIC DEFAULT 0,
  received_by TEXT NOT NULL,
  notes TEXT,
  created_at TEXT
);

-- 24. Expenses Table
CREATE TABLE IF NOT EXISTS dugsiga_expenses (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  expense_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  vendor_payee TEXT NOT NULL,
  reference_number TEXT,
  receipt_document TEXT,
  created_by TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Approved',
  payroll_id TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 25. Income Table
CREATE TABLE IF NOT EXISTS dugsiga_income (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  income_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  payer TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  payment_id TEXT,
  created_at TEXT
);

-- 26. Budgets Table
CREATE TABLE IF NOT EXISTS dugsiga_budgets (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  period TEXT NOT NULL DEFAULT 'Annual',
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Expense',
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  variance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT
);

-- 27. Payroll Table
CREATE TABLE IF NOT EXISTS dugsiga_payroll (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  employee_type TEXT NOT NULL DEFAULT 'Teacher',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  role_or_department TEXT,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'EVC Plus',
  payroll_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  notes TEXT,
  paid_at TEXT,
  expense_id TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Security defaults: keep RLS enabled and expose tables only to server-side service_role
DO $
DECLARE
  tbl_name TEXT;
  tables_list TEXT[] := ARRAY[
    'dugsiga_users','dugsiga_students','dugsiga_classes','dugsiga_subjects',
    'dugsiga_exam_scores','dugsiga_attendance','dugsiga_fees','dugsiga_settings',
    'dugsiga_teachers','dugsiga_staff','dugsiga_guardians','dugsiga_staff_attendance',
    'dugsiga_timetable','dugsiga_admissions','dugsiga_announcements',
    'dugsiga_library_books','dugsiga_library_loans','dugsiga_inventory',
    'dugsiga_documents','dugsiga_notifications','dugsiga_fee_structures',
    'dugsiga_invoices','dugsiga_payments','dugsiga_expenses','dugsiga_income',
    'dugsiga_budgets','dugsiga_payroll'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_list LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tbl_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl_name);
  END LOOP;
END $;
`;

// RBAC Permissions Mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['*'],
  'School Admin': ['*'],
  'Principal': [
    'students.*', 'teachers.*', 'staff.*', 'guardians.*',
    'attendance.*', 'exams.*', 'classes.*', 'subjects.*',
    'timetable.*', 'admissions.*', 'announcements.*', 'reports.*',
    'communication.*', 'library.*', 'inventory.*', 'finance.view'
  ],
  'Teacher': [
    'students.view', 'attendance.view', 'attendance.manage',
    'exams.view', 'exams.manage', 'classes.view', 'subjects.view',
    'timetable.view', 'reports.view', 'announcements.view'
  ],
  'Accountant': [
    'finance.*', 'students.view', 'reports.view', 'inventory.view', 'announcements.view'
  ],
  'Receptionist': [
    'students.view', 'students.create', 'students.update',
    'admissions.*', 'attendance.view', 'announcements.view', 'communication.*'
  ],
  'Librarian': [
    'library.*', 'students.view', 'staff.view', 'announcements.view'
  ],
  'Staff': [
    'timetable.view', 'announcements.view', 'attendance.view'
  ]
};

function normalizeRole(role: string): string {
  const normalized = String(role || "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    "admin": "School Admin",
    "school admin": "School Admin",
    "super admin": "Super Admin",
    "teacher": "Teacher",
    "staff": "Staff",
    "accountant": "Accountant",
    "receptionist": "Receptionist",
    "librarian": "Librarian",
    "principal": "Principal"
  };
  return aliases[normalized] || role.trim();
}

function hasPermission(role: string, requiredPermission: string): boolean {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  if (permissions.includes('*')) return true;
  if (permissions.includes(requiredPermission)) return true;
  const [domain] = requiredPermission.split('.');
  if (permissions.includes(`${domain}.*`)) return true;
  return false;
}

// Map every protected API surface to a least-privilege permission.
// This is defense-in-depth on top of the existing tenant filters in each handler.
function requiredPermissionForRequest(req: express.Request): string | null {
  const pathName = req.path;

  if (pathName === "/reset") return "system.reset";
  if (pathName === "/db/status" || pathName === "/supabase-server-test") return "system.admin";
  if (pathName === "/documentation-pdf" || pathName.startsWith("/docs/download/")) return "reports.view";
  if (pathName === "/user/profile") return null;

  const read = req.method === "GET";
  const mutationPermission = (domain: string) => `${domain}.manage`;
  const readPermission = (domain: string) => `${domain}.view`;

  if (pathName === "/students/bulk") return "students.manage";
  if (pathName.startsWith("/students")) return read ? readPermission("students") : (req.method === "POST" ? "students.create" : req.method === "PUT" ? "students.update" : "students.delete");
  if (pathName.startsWith("/classes")) return read ? readPermission("classes") : mutationPermission("classes");
  if (pathName.startsWith("/subjects")) return read ? readPermission("subjects") : mutationPermission("subjects");
  if (pathName.startsWith("/exams")) return read ? readPermission("exams") : "exams.manage";
  if (pathName.startsWith("/attendance")) return read ? readPermission("attendance") : "attendance.manage";
  if (pathName.startsWith("/teachers")) return read ? readPermission("teachers") : mutationPermission("teachers");
  if (pathName.startsWith("/staff-attendance")) return read ? readPermission("attendance") : "attendance.manage";
  if (pathName.startsWith("/staff")) return read ? readPermission("staff") : mutationPermission("staff");
  if (pathName.startsWith("/guardians")) return read ? readPermission("guardians") : mutationPermission("guardians");
  if (pathName.startsWith("/timetable")) return read ? readPermission("timetable") : mutationPermission("timetable");
  if (pathName.startsWith("/admissions")) return read ? readPermission("admissions") : mutationPermission("admissions");
  if (pathName.startsWith("/announcements")) return read ? readPermission("announcements") : mutationPermission("announcements");
  if (pathName.startsWith("/library/")) return read ? readPermission("library") : mutationPermission("library");
  if (pathName.startsWith("/inventory")) return read ? readPermission("inventory") : mutationPermission("inventory");
  if (pathName.startsWith("/notifications")) return read ? "announcements.view" : "communication.manage";
  if (pathName.startsWith("/analytics/") || pathName.startsWith("/reports/")) return "reports.view";

  if (
    pathName.startsWith("/fee-structures") ||
    pathName.startsWith("/invoices") ||
    pathName.startsWith("/payments") ||
    pathName.startsWith("/expenses") ||
    pathName.startsWith("/income") ||
    pathName.startsWith("/payroll") ||
    pathName.startsWith("/budgets")
  ) {
    return read ? "finance.view" : "finance.manage";
  }

  if (pathName === "/profit-loss" || pathName === "/cash-flow" || pathName === "/finance/stats" || pathName === "/financial-reports") {
    return "finance.view";
  }

  return null;
}

// Password hashing is centralized in server/authSession.ts.

// ✅ EMAIL VERIFICATION LA SAARAY - Auto verified
async function sendVerificationEmail(toEmail: string, code: string) {
  console.log(`Auto-verified user: ${toEmail} (no email required)`);
  return true;
}

function expressWithSupabase(config: any, handler: any) {
  let webHandler: any = null;
  try {
    webHandler = withSupabase(config, handler);
  } catch (err) {
    console.error("expressWithSupabase initialization failed, will retry lazily:", err);
  }
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      if (!webHandler) {
        try {
          webHandler = withSupabase(config, handler);
        } catch (innerErr: any) {
          return res.status(500).json({
            error: "Failed to initialize Supabase server adapter.",
            message: innerErr?.message || String(innerErr)
          });
        }
      }
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const host = req.get("host") || "localhost:3000";
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;
      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (val) {
          if (Array.isArray(val)) {
            val.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, val);
          }
        }
      }
      if (process.env.SUPABASE_PUBLISHABLE_KEY) {
        if (!headers.has("apikey")) {
          headers.set("apikey", process.env.SUPABASE_PUBLISHABLE_KEY);
        }
        if (!headers.has("authorization") && req.headers.authorization) {
          headers.set("authorization", req.headers.authorization);
        } else if (!headers.has("authorization")) {
          headers.set("authorization", `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY}`);
        }
      }
      let body: string | undefined;
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body) {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
      const webRequest = new Request(fullUrl, {
        method: req.method,
        headers,
        body,
        duplex: body ? "half" : undefined
      } as any);
      const webResponse = await webHandler(webRequest);
      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const responseText = await webResponse.text();
      res.send(responseText);
    } catch (error) {
      console.error("expressWithSupabase Adapter Error:", error);
      next(error);
    }
  };
}


/* ============================================================================
   STUDENTS MODULE - PRODUCTION VALIDATION / AUDIT HELPERS
   ============================================================================ */
const STUDENT_ALLOWED_STATUSES = new Set(["active", "inactive", "archived"]);
const STUDENT_ALLOWED_GENDERS = new Set(["Male", "Female"]);
const STUDENT_MAX_BULK = 200;

function cleanStudentString(value: unknown, field: string, maxLength: number, required = false): { ok: boolean; value: string; error?: string } {
  if (value === undefined || value === null) {
    if (required) return { ok: false, value: "", error: \`\${field} waa qasab.\` };
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, value: "", error: \`\${field} waa inuu noqdaa qoraal sax ah.\` };
  }
  const normalized = value.trim();
  if (required && !normalized) {
    return { ok: false, value: "", error: \`\${field} waa qasab.\` };
  }
  if (normalized.length > maxLength) {
    return { ok: false, value: "", error: \`\${field} kama badnaan karo \${maxLength} xaraf.\` };
  }
  return { ok: true, value: normalized };
}

function isValidDateOnly(value: string): boolean {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function isValidStudentPhone(value: string): boolean {
  return !value || /^[+0-9()\\s.-]{7,30}$/.test(value);
}

function isSafeStudentId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(value);
}

function validateStudentPayload(
  payload: any,
  options: { partial?: boolean; allowId?: boolean; allowCreatedAt?: boolean } = {}
): { ok: boolean; value: Record<string, any>; error?: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, value: {}, error: "Xogta ardayga ma saxna." };
  }

  const partial = options.partial === true;
  const value: Record<string, any> = {};

  const hasValue = (key: string) =>
    Object.prototype.hasOwnProperty.call(payload, key) &&
    payload[key] !== undefined &&
    payload[key] !== null;

  const readString = (key: string, label: string, max: number, required = false) => {
    const present = hasValue(key);
    if (partial && !present) return true;
    const result = cleanStudentString(payload[key], label, max, required);
    if (!result.ok) {
      value.__error = result.error;
      return false;
    }
    value[key] = result.value;
    return true;
  };

  if (!readString("fullName", "Magaca ardayga", 160, !partial)) return { ok: false, value: {}, error: value.__error };
  if (!readString("class", "Fasalka", 120, !partial)) return { ok: false, value: {}, error: value.__error };
  if (!readString("guardianPhone", "Telefoonka waalidka", 30, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("guardianName", "Magaca waalidka", 160, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("guardianRelationship", "Xiriirka waalidka", 60, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("guardianPhoneAlt", "Telefoonka labaad", 30, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("section", "Section", 50, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("rollNumber", "Roll Number", 50, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("nationalId", "National ID", 80, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("previousSchool", "School-kii hore", 160, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("bloodGroup", "Blood Group", 20, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("address", "Cinwaanka", 500, false)) return { ok: false, value: {}, error: value.__error };
  if (!readString("medicalNotes", "Medical Notes", 2000, false)) return { ok: false, value: {}, error: value.__error };

  if (!partial || hasValue("gender")) {
    const gender = typeof payload.gender === "string" && payload.gender.trim() ? payload.gender.trim() : partial ? "" : "Male";
    if (!gender && partial) return { ok: false, value: {}, error: "Jinsiga ma saxna." };
    if (gender && !STUDENT_ALLOWED_GENDERS.has(gender)) return { ok: false, value: {}, error: "Jinsiga ardayga ma saxna." };
    if (gender) value.gender = gender;
  }

  if (!partial || hasValue("status")) {
    const status = typeof payload.status === "string" && payload.status.trim() ? payload.status.trim().toLowerCase() : partial ? "" : "active";
    if (!status && partial) return { ok: false, value: {}, error: "Xaaladda ardayga ma saxna." };
    if (status && !STUDENT_ALLOWED_STATUSES.has(status)) return { ok: false, value: {}, error: "Xaaladda ardayga ma saxna." };
    if (status) value.status = status;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, "guardianPhone")) {
    if (!isValidStudentPhone(value.guardianPhone ?? "")) return { ok: false, value: {}, error: "Telefoonka waalidka ma saxna." };
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, "guardianPhoneAlt")) {
    if (!isValidStudentPhone(value.guardianPhoneAlt ?? "")) return { ok: false, value: {}, error: "Telefoonka labaad ma saxna." };
  }

  if (!partial || hasValue("dateOfBirth")) {
    const dob = value.dateOfBirth ?? (typeof payload.dateOfBirth === "string" ? payload.dateOfBirth.trim() : "");
    if (dob) {
      if (!isValidDateOnly(dob)) return { ok: false, value: {}, error: "Taariikhda dhalashada ma saxna. Isticmaal YYYY-MM-DD." };
      if (dob > new Date().toISOString().slice(0, 10)) return { ok: false, value: {}, error: "Taariikhda dhalashada mustaqbal ma noqon karto." };
    }
    value.dateOfBirth = dob;
  }

  if (!partial || (options.allowCreatedAt && hasValue("createdAt"))) {
    const createdAt = typeof payload.createdAt === "string" ? payload.createdAt.trim() : "";
    if (createdAt && !isValidDateOnly(createdAt)) return { ok: false, value: {}, error: "Taariikhda diiwaangelinta ma saxna. Isticmaal YYYY-MM-DD." };
    if (createdAt && createdAt > new Date().toISOString().slice(0, 10)) return { ok: false, value: {}, error: "Taariikhda diiwaangelintu mustaqbal ma noqon karto." };
    if (createdAt) value.createdAt = createdAt;
  }

  if (!partial && options.allowId !== false && Object.prototype.hasOwnProperty.call(payload, "id")) {
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    if (id && !isSafeStudentId(id)) return { ok: false, value: {}, error: "Student ID-ga ma saxna." };
    if (id) value.id = id;
  }

  if (!partial || hasValue("photo")) {
    const photo = typeof payload.photo === "string" ? payload.photo.trim() : "";
    if (photo.length > 1_500_000) return { ok: false, value: {}, error: "Sawirka ardayga aad buu u weyn yahay." };
    value.photo = photo;
  }

  if (!partial && !value.createdAt) value.createdAt = new Date().toISOString().slice(0, 10);
  if (!partial && value.status === undefined) value.status = "active";
  if (!partial && value.gender === undefined) value.gender = "Male";
  if (!partial && value.guardianPhone === undefined) value.guardianPhone = "";

  delete value.__error;
  return { ok: true, value };
}

function formatStudentRow(s: any): any {
  return {
    id: s.id,
    fullName: s.full_name,
    class: s.class,
    gender: s.gender,
    guardianPhone: s.guardian_phone || "",
    status: s.status || "active",
    createdAt: s.created_at || "",
    updatedAt: s.updated_at || s.created_at || "",
    photo: s.photo || "",
    dateOfBirth: s.date_of_birth || "",
    address: s.address || "",
    guardianName: s.guardian_name || "",
    guardianRelationship: s.guardian_relationship || "",
    guardianPhoneAlt: s.guardian_phone_alt || "",
    section: s.section || "",
    rollNumber: s.roll_number || "",
    nationalId: s.national_id || "",
    previousSchool: s.previous_school || "",
    bloodGroup: s.blood_group || "",
    medicalNotes: s.medical_notes || ""
  };
}

async function studentClassExists(schoolId: string, className: string): Promise<boolean> {
  const cleanClass = className.trim();
  if (!cleanClass) return false;

  if (!useLocalFallback) {
    const { data, error } = await supabase
      .from("dugsiga_classes")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_name", cleanClass)
      .limit(1);
    if (error) throw error;
    return (data || []).length > 0;
  }

  return (loadLocalDB().classes || []).some(
    (item: any) => item.schoolId === schoolId && String(item.className || "").trim() === cleanClass
  );
}

async function findStudentUniquenessConflict(
  schoolId: string,
  candidate: Record<string, any>,
  excludeId?: string
): Promise<string | null> {
  if (!supabase) return null;

  if (candidate.id) {
    let query = supabase.from("dugsiga_students").select("id").eq("id", candidate.id).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if ((data || []).length > 0) return "Student ID-gan horey ayaa loo isticmaalay.";
  }

  if (candidate.fullName && candidate.class) {
    let query = supabase
      .from("dugsiga_students")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class", candidate.class)
      .ilike("full_name", candidate.fullName)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if ((data || []).length > 0) return "Magacan iyo fasalkan arday hore ayaa loogu diiwaangeliyey.";
  }

  if (candidate.nationalId) {
    let query = supabase
      .from("dugsiga_students")
      .select("id")
      .eq("school_id", schoolId)
      .ilike("national_id", candidate.nationalId)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if ((data || []).length > 0) return "National ID-gan hore ayaa loogu isticmaalay arday kale.";
  }

  if (candidate.rollNumber) {
    let query = supabase
      .from("dugsiga_students")
      .select("id")
      .eq("school_id", schoolId)
      .ilike("roll_number", candidate.rollNumber)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if ((data || []).length > 0) return "Roll Number-kan hore ayaa loogu isticmaalay arday kale.";
  }

  return null;
}

async function recordStudentAudit(
  req: express.Request,
  schoolId: string,
  studentId: string,
  action: "created" | "updated" | "archived" | "restored" | "deleted",
  changedFields: string[]
): Promise<void> {
  if (!supabase || useLocalFallback) return;
  const actor = getAuthenticatedUser(req, loadLocalDB);
  try {
    const { error } = await supabase.from("dugsiga_student_audit").insert([{
      school_id: schoolId,
      student_id: studentId,
      action,
      actor_email: actor?.email || null,
      actor_role: actor?.role || null,
      changed_fields: { fields: Array.from(new Set(changedFields)).slice(0, 50) }
    }]);
    if (error) console.warn("Student audit log failed:", error.message);
  } catch (error: any) {
    console.warn("Student audit log failed:", error?.message || error);
  }
}

async function getStudentDependencyIds(studentIds: string[], schoolId: string): Promise<Set<string>> {
  const dependentTables = [
    ["dugsiga_attendance", "student_id"],
    ["dugsiga_fees", "student_id"],
    ["dugsiga_exam_scores", "student_id"],
    ["dugsiga_invoices", "student_id"],
    ["dugsiga_payments", "student_id"],
    ["dugsiga_library_loans", "borrower_id"],
    ["dugsiga_admissions", "student_id"]
  ] as const;

  const dependentIds = new Set<string>();
  if (!supabase || studentIds.length === 0) return dependentIds;

  const results = await Promise.all(
    dependentTables.map(async ([table, column]) => {
      const { data, error } = await supabase.from(table).select(column).in(column, studentIds).limit(STUDENT_MAX_BULK);
      if (error) throw error;
      return (data || []).map((row: any) => String(row[column] || ""));
    })
  );

  for (const ids of results) for (const id of ids) if (id) dependentIds.add(id);
  return dependentIds;
}

/* ==============================================
   API ROUTES
   ============================================== */

const PUBLIC_API_PATHS = [
  /^\/auth\/signup$/,
  /^\/auth\/login$/,
  /^\/auth\/verify$/,
  /^\/teachers\/verify-invitation\/[^/]+$/,
  /^\/teachers\/activate-account$/
];

app.use("/api", (req, res, next) => {
  const publicPath = PUBLIC_API_PATHS.some((pattern) => pattern.test(req.path));
  if (publicPath) {
    return next();
  }
  return requireAuthenticatedRequest(req, res, next);
});

app.use("/api", (req, res, next) => {
  const publicPath = PUBLIC_API_PATHS.some((pattern) => pattern.test(req.path));
  if (publicPath) return next();

  const requiredPermission = requiredPermissionForRequest(req);
  if (!requiredPermission) return next();

  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (!authUser) {
    return res.status(401).json({
      error: "Unauthorized. Fadlan marka hore gal akoonkaaga."
    });
  }

  if (!hasPermission(authUser.role, requiredPermission)) {
    return res.status(403).json({
      error: "Fasax ku filan ma lihid hawshan (Forbidden)."
    });
  }

  next();
});

app.get("/api/db/status", async (req, res) => {
  try {
    await checkSupabaseStatus();
    res.json({
      connected: !useLocalFallback && customSupabaseActive,
      fallbackMode: useLocalFallback,
      customSupabaseActive: customSupabaseActive
    });
  } catch (err: any) {
    console.error("Error in /api/db/status:", err);
    res.status(500).json({
      connected: false,
      fallbackMode: true,
      customSupabaseActive: false,
      customSupabaseConfigured: false,
      supabaseUrl: "",
      error: err.message
    });
  }
});

app.get("/api/docs/download/pdf", (req, res) => {
  const filePath = path.join(process.cwd(), "DUGSI_PRO_2026_FULL_DOCUMENTATION.pdf");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="DUGSI_PRO_2026_FULL_DOCUMENTATION.pdf"');
    res.setHeader("Content-Type", "application/pdf");
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: "PDF documentation not found" });
});

app.get("/api/docs/download/word", (req, res) => {
  const filePath = path.join(process.cwd(), "DUGSI_PRO_2026_FULL_DOCUMENTATION.doc");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="DUGSI_PRO_2026_FULL_DOCUMENTATION.doc"');
    res.setHeader("Content-Type", "application/msword");
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: "Word documentation not found" });
});

app.get("/api/supabase-server-test", expressWithSupabase({ auth: "none" }, async (_req: any, ctx: any) => {
  try {
    const { error: usersError } = await ctx.supabaseAdmin.from("dugsiga_users").select("email").limit(1);
    const { error: studentsError } = await ctx.supabaseAdmin.from("dugsiga_students").select("id").limit(1);
    return Response.json({
      status: "success",
      message: "Supabase server SDK successfully configured!",
      has_supabase_client: !!ctx.supabase,
      has_supabase_admin_client: !!ctx.supabaseAdmin,
      database_check: !usersError && !studentsError
    });
  } catch (err: any) {
    return Response.json({ status: "error", message: err.message }, { status: 500 });
  }
}));

app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || !email.includes("@")) {
    return res.status(400).json({ error: "Email sax ah iyo password fadlan geli." });
  }
  const cleanEmail = email.trim().toLowerCase();
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }
  const passwordHash = await hashPassword(password);

  const db = loadLocalDB();
  const existingLocalUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  // If Supabase is connected, attempt check & sync to Supabase
  if (!useLocalFallback && supabase) {
    try {
      const { data: existingUser } = await supabase
        .from("dugsiga_users")
        .select("email")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey. Fadlan 'Sign In' ku gal." });
      }

      const { error: insertError } = await supabase.from("dugsiga_users").insert([{
        email: cleanEmail, password: passwordHash, verified: true, role: "admin", school_id: cleanEmail
      }]);

      if (insertError) {
        if (insertError.code === "23505") {
          return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey. Fadlan 'Sign In' ku gal." });
        }
        console.warn("Supabase auth insert notice:", insertError.message);
      }
    } catch (sbErr: any) {
      console.warn("Supabase auth notice:", sbErr?.message || sbErr);
    }
  } else if (existingLocalUser) {
    return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey. Fadlan 'Sign In' ku gal." });
  }

  // Always ensure user is saved in local database for seamless offline resilience
  if (!db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    db.users.push({
      email: cleanEmail,
      password_hash: passwordHash,
      verified: true,
      role: "admin",
      school_id: cleanEmail
    });
    saveLocalDB(db);
  }

  res.json({
    success: true,
    message: "Diiwaangelintu way guuleysatay! Hadda geli kartaa.",
    emailSent: false,
    user: { email: cleanEmail }
  });
});

app.post("/api/auth/verify", async (req, res) => {
  res.json({ success: true, message: "Verification step is disabled. Automated success." });
});

app.post("/api/auth/logout", (req, res) => {
  const token = getSessionTokenFromRequest(req);
  if (token) revokeSession(token);
  clearSessionCookie(req, res);
  return res.json({ success: true });
});

app.get("/api/documentation-pdf", (req, res) => {
  const publicPdf = path.join(process.cwd(), "public", "DUGSI_PRO_2026_DOCUMENTATION.pdf");
  const rootPdf = path.join(process.cwd(), "DUGSI_PRO_2026_DOCUMENTATION.pdf");
  const target = fs.existsSync(publicPdf) ? publicPdf : fs.existsSync(rootPdf) ? rootPdf : null;
  if (target) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="DUGSI_PRO_2026_DOCUMENTATION.pdf"');
    return res.sendFile(target);
  }
  res.status(404).json({ error: "Documentation PDF lama helin." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Fadlan geli email iyo password." });
  const cleanEmail = email.trim().toLowerCase();
  const db = loadLocalDB();
  const localUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  // 1. Supabase is the cloud source of truth when available.
  if (!useLocalFallback && supabase) {
    try {
      const { data: user, error } = await supabase
        .from("dugsiga_users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (!error && user) {
        const cloudCheck = await verifyPassword(password, user.password);
        const localCheck = localUser
          ? await verifyPassword(password, localUser.password_hash)
          : { valid: false, needsRehash: false };

        if (!cloudCheck.valid && !localCheck.valid) {
          return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
        }

        let upgradedHash: string | null = null;
        if (cloudCheck.needsRehash || localCheck.needsRehash || !cloudCheck.valid) {
          upgradedHash = await hashPassword(password);
          await supabase
            .from("dugsiga_users")
            .update({ password: upgradedHash })
            .ilike("email", cleanEmail);
        }

        const canonicalHash = upgradedHash || user.password;
        const localIdx = db.users.findIndex(u => u.email.toLowerCase() === cleanEmail);
        if (localIdx !== -1) {
          db.users[localIdx].password_hash = canonicalHash;
          db.users[localIdx].verified = true;
          db.users[localIdx].role = user.role || db.users[localIdx].role || "admin";
          db.users[localIdx].school_id = user.school_id || db.users[localIdx].school_id || cleanEmail;
          db.users[localIdx].teacher_id = user.teacher_id || db.users[localIdx].teacher_id;
        } else {
          db.users.push({
            email: cleanEmail,
            password_hash: canonicalHash,
            verified: true,
            role: user.role || "admin",
            school_id: user.school_id || cleanEmail,
            teacher_id: user.teacher_id
          });
        }
        saveLocalDB(db);

        if (String(user.role || "").trim().toLowerCase() === "teacher" && user.teacher_id) {
          const { data: cloudTeacher, error: teacherLookupError } = await supabase
            .from("dugsiga_teachers")
            .select("id, school_id, name, email, status, assigned_classes, assigned_subjects")
            .eq("id", user.teacher_id)
            .eq("school_id", user.school_id || cleanEmail)
            .maybeSingle();

          if (teacherLookupError) {
            console.warn("Teacher status lookup error:", teacherLookupError.message);
            return res.status(503).json({
              error: "Akoonka macallinka lama xaqiijin karin hadda. Fadlan mar kale isku day."
            });
          } else if (!cloudTeacher) {
            return res.status(403).json({ error: "Akoonka macallinka lama helin ama waa la saaray." });
          } else if (cloudTeacher.status === "DEACTIVATED" || cloudTeacher.status === "INACTIVE") {
            return res.status(403).json({ error: "Akoonkaaga macallinka waa la hakiyey (Account deactivated). Fadlan la xiriir maamulka iskuulka." });
          } else if (cloudTeacher.status === "INVITED") {
            return res.status(403).json({ error: "Akoonkan weli lama dhaqaajin. Fadlan isticmaal link-gii casuumaadda." });
          }

          const teacherPayload: any = {
            email: cleanEmail,
            role: "teacher",
            name: cloudTeacher.name,
            teacherId: cloudTeacher.id,
            schoolId: cloudTeacher.school_id || user.school_id || cleanEmail,
            assignedClasses: Array.isArray(cloudTeacher.assigned_classes) ? cloudTeacher.assigned_classes : [],
            assignedSubjects: Array.isArray(cloudTeacher.assigned_subjects) ? cloudTeacher.assigned_subjects : []
          };
          const token = createSessionToken(teacherPayload);
          setSessionCookie(req, res, token);
          clearAuthRateLimit(`login:ip:${req.ip || "unknown"}:`);
          clearAuthRateLimit(`login:account:${req.ip || "unknown"}:${cleanEmail}`);
          return res.json({ success: true, user: teacherPayload });
        }

        const authRes = buildAuthResponse(cleanEmail, db);
        if (authRes.error) return res.status(403).json({ error: authRes.error });
        if (!authRes.error && authRes.token) {
          setSessionCookie(req, res, authRes.token);
          const { token: _token, ...safeAuthResponse } = authRes;
          clearAuthRateLimit(`login:ip:${req.ip || "unknown"}:`);
          clearAuthRateLimit(`login:account:${req.ip || "unknown"}:${cleanEmail}`);
          return res.json(safeAuthResponse);
        }
        clearAuthRateLimit(`login:ip:${req.ip || "unknown"}:`);
        clearAuthRateLimit(`login:account:${req.ip || "unknown"}:${cleanEmail}`);
        return res.json(authRes);
      }
    } catch (e: any) {
      console.warn("Supabase login check notice:", e?.message || e);
    }
  }

  // 2. Secure local fallback with transparent legacy-hash upgrade.
  if (localUser) {
    const localCheck = await verifyPassword(password, localUser.password_hash);
    if (!localCheck.valid) {
      return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
    }

    if (localCheck.needsRehash) {
      localUser.password_hash = await hashPassword(password);
      saveLocalDB(db);
    }

    const authRes = buildAuthResponse(cleanEmail, db);
    if (authRes.error) return res.status(403).json({ error: authRes.error });
    if (!authRes.error && authRes.token) {
      setSessionCookie(req, res, authRes.token);
      const { token: _token, ...safeAuthResponse } = authRes;
      clearAuthRateLimit(`login:ip:${req.ip || "unknown"}:`);
      clearAuthRateLimit(`login:account:${req.ip || "unknown"}:${cleanEmail}`);
      return res.json(safeAuthResponse);
    }
    clearAuthRateLimit(`login:ip:${req.ip || "unknown"}:`);
    clearAuthRateLimit(`login:account:${req.ip || "unknown"}:${cleanEmail}`);
    return res.json(authRes);
  }

  return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
});


app.get("/api/students", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (!schoolId || !authUser) return res.status(401).json({ error: "Session-ka lama xaqiijin." });

  const isTeacher = authUser.role === "teacher";
  const teacherClasses = Array.isArray(authUser.assignedClasses)
    ? authUser.assignedClasses.map((c) => String(c).trim()).filter(Boolean)
    : [];

  if (!useLocalFallback) {
    try {
      let query = supabase.from("dugsiga_students").select("*").eq("school_id", schoolId).order("full_name", { ascending: true });
      if (isTeacher) {
        if (teacherClasses.length === 0) return res.json([]);
        query = query.in("class", teacherClasses);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.json((data || []).map(formatStudentRow));
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Ardayda (Fetch Students)");
    }
  }

  const db = loadLocalDB();
  let list = (db.students || []).filter((s: any) => s.schoolId === schoolId);
  if (isTeacher) {
    if (teacherClasses.length === 0) return res.json([]);
    list = list.filter((s: any) => teacherClasses.includes(String(s.class || "").trim()));
  }
  return res.json(list);
});

app.post("/api/students/check-duplicate", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!schoolId) return res.status(401).json({ error: "Session-ka lama xaqiijin." });

  const raw = req.body || {};
  const candidate = validateStudentPayload({
    fullName: raw.fullName,
    class: raw.className,
    guardianPhone: raw.guardianPhone,
    rollNumber: raw.rollNumber,
    nationalId: raw.nationalId,
    gender: raw.gender
  }, { partial: true });

  if (!candidate.ok) return res.status(400).json({ error: candidate.error });

  try {
    const conflicts: any[] = [];
    const excludeId = typeof raw.excludeId === "string" ? raw.excludeId.trim() : undefined;

    if (!useLocalFallback) {
      const checks = [
        raw.studentId
          ? supabase.from("dugsiga_students").select("id,full_name,class,guardian_phone").eq("school_id", schoolId).eq("id", String(raw.studentId).trim()).limit(1)
          : Promise.resolve({ data: [], error: null }),
        candidate.value.fullName && candidate.value.class
          ? supabase.from("dugsiga_students").select("id,full_name,class,guardian_phone").eq("school_id", schoolId).eq("class", candidate.value.class).ilike("full_name", candidate.value.fullName).limit(5)
          : Promise.resolve({ data: [], error: null }),
        candidate.value.rollNumber
          ? supabase.from("dugsiga_students").select("id,full_name,class,guardian_phone,roll_number").eq("school_id", schoolId).ilike("roll_number", candidate.value.rollNumber).limit(5)
          : Promise.resolve({ data: [], error: null }),
        candidate.value.nationalId
          ? supabase.from("dugsiga_students").select("id,full_name,class,guardian_phone,national_id").eq("school_id", schoolId).ilike("national_id", candidate.value.nationalId).limit(5)
          : Promise.resolve({ data: [], error: null })
      ];

      const results = await Promise.all(checks);
      for (const result of results) {
        if (result.error) throw result.error;
        for (const row of result.data || []) {
          if (!excludeId || row.id !== excludeId) conflicts.push(row);
        }
      }
    } else {
      const students = (loadLocalDB().students || []).filter((s: any) => s.schoolId === schoolId);
      for (const s of students) {
        if (excludeId && s.id === excludeId) continue;
        const sameId = raw.studentId && String(s.id).toLowerCase() === String(raw.studentId).trim().toLowerCase();
        const sameNameClass = candidate.value.fullName && candidate.value.class &&
          String(s.fullName || "").trim().toLowerCase() === candidate.value.fullName.toLowerCase() &&
          String(s.class || "").trim() === candidate.value.class;
        const sameRoll = candidate.value.rollNumber && String(s.rollNumber || "").trim().toLowerCase() === candidate.value.rollNumber.toLowerCase();
        const sameNational = candidate.value.nationalId && String(s.nationalId || "").trim().toLowerCase() === candidate.value.nationalId.toLowerCase();
        if (sameId || sameNameClass || sameRoll || sameNational) conflicts.push(s);
      }
    }

    const unique = Array.from(new Map(conflicts.map((row) => [row.id, row])).values()).slice(0, 10);
    const hasDuplicate = unique.length > 0;
    return res.json({
      hasDuplicate,
      duplicate: hasDuplicate,
      reason: hasDuplicate ? "Xog arday oo isku mid ah ayaa horey u jiray." : undefined,
      existingStudent: hasDuplicate ? unique[0] : undefined,
      duplicates: unique
    });
  } catch (e: any) {
    return handleSupabaseError(res, e, "Hubinta duplicate-ka ardayga");
  }
});

app.post("/api/students/bulk", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (!schoolId || !authUser) return res.status(401).json({ error: "Session-ka lama xaqiijin." });

  const action = typeof req.body?.action === "string" ? req.body.action.trim() : "";
  const rawIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
  const studentIds = Array.from(new Set(
    rawIds.filter((id: unknown): id is string => typeof id === "string")
      .map((id) => id.trim()).filter(Boolean)
  ));

  if (!studentIds.length) return res.status(400).json({ error: "studentIds waa qasab." });
  if (studentIds.length > STUDENT_MAX_BULK) return res.status(400).json({ error: \`Hal mar kama badnaan karaan \${STUDENT_MAX_BULK} arday.\` });
  if (!["change_status", "change_class", "archive", "delete"].includes(action)) {
    return res.status(400).json({ error: "Action-ka bulk-ga ma saxna." });
  }

  const targetStatus = typeof req.body?.targetStatus === "string" ? req.body.targetStatus.trim().toLowerCase() : "";
  const targetClass = typeof req.body?.targetClass === "string" ? req.body.targetClass.trim() : "";
  if ((action === "change_status" && !STUDENT_ALLOWED_STATUSES.has(targetStatus)) || (action === "change_class" && !targetClass)) {
    return res.status(400).json({ error: "Qiimaha bulk-ga ma saxna." });
  }

  if (!useLocalFallback) {
    try {
      if (action === "change_class" && !(await studentClassExists(schoolId, targetClass))) {
        return res.status(400).json({ error: "Fasalka cusub kama jiro school-kan." });
      }

      const { data: rows, error: rowsError } = await supabase.from("dugsiga_students").select("id,class,status").eq("school_id", schoolId).in("id", studentIds);
      if (rowsError) throw rowsError;
      const found = rows || [];
      if (found.length !== studentIds.length) {
        const foundIds = new Set(found.map((row: any) => row.id));
        return res.status(404).json({
          error: "Qaar ka mid ah ardayda lama helin ama school-kan kama tirsana.",
          missingIds: studentIds.filter((id) => !foundIds.has(id)).slice(0, 20)
        });
      }

      if (action === "delete") {
        const dependentIds = await getStudentDependencyIds(studentIds, schoolId);
        if (dependentIds.size > 0) {
          return res.status(409).json({
            error: "Qaar ka mid ah ardaydan waxay leeyihiin xog ku xiran. Isticmaal Archive halkii Delete.",
            dependentCount: dependentIds.size
          });
        }

        const { data: deleted, error } = await supabase.from("dugsiga_students").delete().eq("school_id", schoolId).in("id", studentIds).select("id");
        if (error) throw error;
        const deletedIds = (deleted || []).map((row: any) => row.id);
        await Promise.all(deletedIds.map((id) => recordStudentAudit(req, schoolId, id, "deleted", ["student"])));
        return res.json({ success: true, count: deletedIds.length });
      }

      const nextStatus = action === "archive" ? "archived" : action === "change_status" ? targetStatus : undefined;
      const updateObj: any = { updated_at: new Date().toISOString() };
      if (action === "change_class") updateObj.class = targetClass;
      if (nextStatus) updateObj.status = nextStatus;

      const { data: updated, error } = await supabase.from("dugsiga_students").update(updateObj).eq("school_id", schoolId).in("id", studentIds).select("id,status");
      if (error) throw error;

      const updatedRows = updated || [];
      await Promise.all(updatedRows.map((row: any) =>
        recordStudentAudit(req, schoolId, row.id, row.status === "archived" ? "archived" : "updated", Object.keys(updateObj).filter((key) => key !== "updated_at"))
      ));
      return res.json({ success: true, count: updatedRows.length });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Hawsha guud ee ardayda (Bulk Students Operation)");
    }
  }

  const db = loadLocalDB();
  const selected = (db.students || []).filter((s: any) => s.schoolId === schoolId && studentIds.includes(s.id));
  if (selected.length !== studentIds.length) return res.status(404).json({ error: "Qaar ka mid ah ardayda lama helin." });

  if (action === "delete") {
    const hasDependencies =
      (db.fees || []).some((f: any) => studentIds.includes(f.studentId) && f.schoolId === schoolId) ||
      (db.attendance || []).some((a: any) => studentIds.includes(a.studentId) && a.schoolId === schoolId) ||
      (db.examScores || []).some((e: any) => studentIds.includes(e.studentId) && e.schoolId === schoolId);
    if (hasDependencies) return res.status(409).json({ error: "Qaar ka mid ah ardaydan waxay leeyihiin xog ku xiran. Isticmaal Archive." });
    db.students = db.students.filter((s: any) => !(studentIds.includes(s.id) && s.schoolId === schoolId));
  } else {
    db.students = db.students.map((s: any) => {
      if (!studentIds.includes(s.id) || s.schoolId !== schoolId) return s;
      if (action === "change_class") return { ...s, class: targetClass, updatedAt: new Date().toISOString() };
      return { ...s, status: action === "archive" ? "archived" : targetStatus, updatedAt: new Date().toISOString() };
    });
  }

  saveLocalDB(db);
  return res.json({ success: true, count: studentIds.length });
});

app.post("/api/students", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (!schoolId || !authUser) return res.status(401).json({ error: "Session-ka lama xaqiijin." });

  const validation = validateStudentPayload(req.body, { partial: false, allowId: true, allowCreatedAt: true });
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const student = validation.value;
  const studentId = student.id || \`STD-\${crypto.randomUUID().slice(0, 8).toUpperCase()}\`;
  const createdAt = student.createdAt || new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  try {
    if (!useLocalFallback) {
      if (!(await studentClassExists(schoolId, student.class))) {
        return res.status(400).json({ error: "Fasalka la doortay kama jiro school-kan." });
      }

      const conflict = await findStudentUniquenessConflict(schoolId, { ...student, id: studentId });
      if (conflict) return res.status(409).json({ error: conflict });

      const insertObj = {
        id: studentId,
        school_id: schoolId,
        full_name: student.fullName,
        class: student.class,
        gender: student.gender || "Male",
        guardian_phone: student.guardianPhone || "",
        status: student.status || "active",
        photo: student.photo || "",
        date_of_birth: student.dateOfBirth || "",
        address: student.address || "",
        guardian_name: student.guardianName || "",
        guardian_relationship: student.guardianRelationship || "",
        guardian_phone_alt: student.guardianPhoneAlt || "",
        section: student.section || "",
        roll_number: student.rollNumber || "",
        national_id: student.nationalId || "",
        previous_school: student.previousSchool || "",
        blood_group: student.bloodGroup || "",
        medical_notes: student.medicalNotes || "",
        created_at: createdAt,
        updated_at: nowIso
      };

      const { data, error } = await supabase.from("dugsiga_students").insert([insertObj]).select("*").single();
      if (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Student ID, Roll Number, ama National ID hore ayaa loo isticmaalay." });
        throw error;
      }

      await recordStudentAudit(req, schoolId, studentId, "created", Object.keys(insertObj).filter((key) => !["school_id", "created_at", "updated_at"].includes(key)));
      return res.status(201).json(formatStudentRow(data));
    }

    const db = loadLocalDB();
    const conflict = (db.students || []).some((s: any) =>
      s.schoolId === schoolId &&
      s.id !== studentId &&
      (
        (s.fullName || "").trim().toLowerCase() === student.fullName.toLowerCase() && (s.class || "").trim() === student.class ||
        (student.rollNumber && (s.rollNumber || "").trim().toLowerCase() === student.rollNumber.toLowerCase()) ||
        (student.nationalId && (s.nationalId || "").trim().toLowerCase() === student.nationalId.toLowerCase())
      )
    );
    if (conflict) return res.status(409).json({ error: "Xogtan waxay la mid tahay arday hore." });

    const fullStudent = { ...student, id: studentId, schoolId, createdAt, updatedAt: nowIso };
    db.students.push(fullStudent);
    saveLocalDB(db);
    return res.status(201).json(fullStudent);
  } catch (e: any) {
    return handleSupabaseError(res, e, "Diiwaangelinta Ardayga (Add Student)");
  }
});

app.put("/api/students/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (!schoolId || !authUser) return res.status(401).json({ error: "Session-ka lama xaqiijin." });

  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!isSafeStudentId(id)) return res.status(400).json({ error: "Student ID-ga ma saxna." });

  const validation = validateStudentPayload(req.body, { partial: true });
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const updates = validation.value;
  const mutableKeys = ["fullName","class","gender","guardianPhone","status","photo","dateOfBirth","address","guardianName","guardianRelationship","guardianPhoneAlt","section","rollNumber","nationalId","previousSchool","bloodGroup","medicalNotes"];
  const changedKeys = mutableKeys.filter((key) => Object.prototype.hasOwnProperty.call(updates, key));
  if (changedKeys.length === 0) return res.status(400).json({ error: "Wax isbeddel ah lama helin." });

  try {
    if (!useLocalFallback) {
      const { data: current, error: currentError } = await supabase.from("dugsiga_students").select("*").eq("school_id", schoolId).eq("id", id).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return res.status(404).json({ error: "Ardayga lama helin." });

      const nextClass = updates.class ?? current.class;
      if (updates.class !== undefined && !(await studentClassExists(schoolId, String(nextClass)))) {
        return res.status(400).json({ error: "Fasalka cusub kama jiro school-kan." });
      }

      const candidate = {
        id,
        fullName: updates.fullName ?? current.full_name,
        class: nextClass,
        rollNumber: updates.rollNumber ?? current.roll_number,
        nationalId: updates.nationalId ?? current.national_id
      };
      const conflict = await findStudentUniquenessConflict(schoolId, candidate, id);
      if (conflict) return res.status(409).json({ error: conflict });

      const dbKey: Record<string, string> = {
        fullName:"full_name", class:"class", gender:"gender", guardianPhone:"guardian_phone", status:"status",
        photo:"photo", dateOfBirth:"date_of_birth", address:"address", guardianName:"guardian_name",
        guardianRelationship:"guardian_relationship", guardianPhoneAlt:"guardian_phone_alt", section:"section",
        rollNumber:"roll_number", nationalId:"national_id", previousSchool:"previous_school",
        bloodGroup:"blood_group", medicalNotes:"medical_notes"
      };
      const updateObj: any = { updated_at: new Date().toISOString() };
      for (const key of changedKeys) updateObj[dbKey[key]] = updates[key];

      const { data: updated, error } = await supabase.from("dugsiga_students").update(updateObj).eq("school_id", schoolId).eq("id", id).select("*").single();
      if (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Student ID, Roll Number, ama National ID hore ayaa loo isticmaalay." });
        throw error;
      }

      const oldStatus = String(current.status || "active");
      const newStatus = String(updated.status || oldStatus);
      const auditAction = oldStatus !== "archived" && newStatus === "archived" ? "archived" : oldStatus === "archived" && newStatus === "active" ? "restored" : "updated";
      await recordStudentAudit(req, schoolId, id, auditAction, changedKeys);
      return res.json(formatStudentRow(updated));
    }

    const db = loadLocalDB();
    const idx = db.students.findIndex((s: any) => s.id === id && s.schoolId === schoolId);
    if (idx === -1) return res.status(404).json({ error: "Ardayga lama helin." });
    const current = db.students[idx];
    const duplicate = (db.students || []).some((s: any) =>
      s.schoolId === schoolId && s.id !== id &&
      (
        (updates.fullName && updates.class && (s.fullName || "").trim().toLowerCase() === updates.fullName.toLowerCase() && (s.class || "").trim() === updates.class) ||
        (updates.rollNumber && (s.rollNumber || "").trim().toLowerCase() === updates.rollNumber.toLowerCase()) ||
        (updates.nationalId && (s.nationalId || "").trim().toLowerCase() === updates.nationalId.toLowerCase())
      )
    );
    if (duplicate) return res.status(409).json({ error: "Xogta cusub waxay la mid tahay arday hore." });

    db.students[idx] = { ...current, ...updates, id, schoolId, updatedAt: new Date().toISOString() };
    saveLocalDB(db);
    return res.json({ success: true });
  } catch (e: any) {
    return handleSupabaseError(res, e, "Tafatirka Ardayga (Update Student)");
  }
});


app.get("/api/students/:id/audit", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";

  if (!schoolId || !authUser) return res.status(401).json({ error: "Session-ka lama xaqiijin." });
  if (!isSafeStudentId(id)) return res.status(400).json({ error: "Student ID-ga ma saxna." });

  try {
    if (!useLocalFallback) {
      const { data: student, error: studentError } = await supabase
        .from("dugsiga_students")
        .select("id,class")
        .eq("school_id", schoolId)
        .eq("id", id)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!student) return res.status(404).json({ error: "Ardayga lama helin." });

      if (authUser.role === "teacher") {
        const assigned = Array.isArray(authUser.assignedClasses)
          ? authUser.assignedClasses.map((c) => String(c).trim()).filter(Boolean)
          : [];
        if (!assigned.includes(String(student.class || "").trim())) {
          return res.status(403).json({ error: "Macallinku ma heli karo taariikhda ardaygan." });
        }
      }

      const { data, error } = await supabase
        .from("dugsiga_student_audit")
        .select("id,student_id,action,actor_email,actor_role,changed_fields,created_at")
        .eq("school_id", schoolId)
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return res.json((data || []).map((item: any) => ({
        id: item.id,
        studentId: item.student_id,
        action: item.action,
        actorEmail: item.actor_email || "",
        actorRole: item.actor_role || "",
        changedFields: Array.isArray(item.changed_fields?.fields) ? item.changed_fields.fields : [],
        createdAt: item.created_at
      })));
    }

    const db = loadLocalDB();
    const student = (db.students || []).find((s: any) => s.id === id && s.schoolId === schoolId);
    if (!student) return res.status(404).json({ error: "Ardayga lama helin." });
    return res.json([]);
  } catch (e: any) {
    return handleSupabaseError(res, e, "Soo qaadista taariikhda ardayga");
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (!schoolId || !authUser) return res.status(401).json({ error: "Session-ka lama xaqiijin." });

  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!isSafeStudentId(id)) return res.status(400).json({ error: "Student ID-ga ma saxna." });

  try {
    if (!useLocalFallback) {
      const { data: current, error: currentError } = await supabase.from("dugsiga_students").select("id,status").eq("school_id", schoolId).eq("id", id).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return res.status(404).json({ error: "Ardayga lama helin." });

      const dependentIds = await getStudentDependencyIds([id], schoolId);
      if (dependentIds.has(id)) {
        return res.status(409).json({ error: "Ardaygan wuxuu leeyahay xog ku xiran. Isticmaal Archive halkii Delete." });
      }

      const { data: deleted, error } = await supabase.from("dugsiga_students").delete().eq("school_id", schoolId).eq("id", id).select("id");
      if (error) throw error;
      if (!deleted || deleted.length === 0) return res.status(404).json({ error: "Ardayga lama helin." });

      await recordStudentAudit(req, schoolId, id, "deleted", ["student"]);
      return res.json({ success: true });
    }

    const db = loadLocalDB();
    const current = db.students.find((s: any) => s.id === id && s.schoolId === schoolId);
    if (!current) return res.status(404).json({ error: "Ardayga lama helin." });

    const hasDependencies =
      (db.fees || []).some((f: any) => f.studentId === id && f.schoolId === schoolId) ||
      (db.attendance || []).some((a: any) => a.studentId === id && a.schoolId === schoolId) ||
      (db.examScores || []).some((e: any) => e.studentId === id && e.schoolId === schoolId);
    if (hasDependencies) return res.status(409).json({ error: "Ardaygan wuxuu leeyahay xog ku xiran. Isticmaal Archive." });

    db.students = db.students.filter((s: any) => !(s.id === id && s.schoolId === schoolId));
    saveLocalDB(db);
    return res.json({ success: true });
  } catch (e: any) {
    return handleSupabaseError(res, e, "Tirtirista Ardayga (Delete Student)");
  }
});

app.get("/api/attendance", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { date, session_type } = req.query;
  if (!useLocalFallback) {
    try {
      let query = supabase.from("dugsiga_attendance").select("*").eq("school_id", schoolId);
      if (date) query = query.eq("date", date as string);
      if (session_type) query = query.eq("session_type", session_type as string);
      let { data, error } = await query;
      if (error) {
        if (error.code === '42703' || (error.message && error.message.toLowerCase().includes('session_type'))) {
          let retryQuery = supabase.from("dugsiga_attendance").select("date, student_id, status, timestamp, school_id").eq("school_id", schoolId);
          if (date) retryQuery = retryQuery.eq("date", date as string);
          const { data: retryData, error: retryError } = await retryQuery;
          if (retryError) throw retryError;
          data = retryData;
        } else { throw error; }
      }
      const formatted = (data || []).map(a => ({ date: a.date, studentId: a.student_id, status: a.status, timestamp: a.timestamp, sessionType: a.session_type || 'before_break' }));
      return res.json(formatted);
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Xaadirinta (Fetch Attendance)"); }
  } else {
    const db = loadLocalDB();
    let list = db.attendance || [];
    list = list.filter(a => a.schoolId === schoolId);
    if (date) list = list.filter(a => a.date === date);
    if (session_type) list = list.filter(a => (a.sessionType || 'before_break') === session_type);
    res.json(list);
  }
});

app.post("/api/attendance", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (authUser?.role === "teacher" && authUser.assignedClasses && authUser.assignedClasses.length > 0) {
    const db = loadLocalDB();
    const students = db.students || [];
    const unassigned = (req.body.records || []).find((r: any) => {
      const st = students.find((s: any) => s.id === r.studentId);
      return st && !authUser.assignedClasses?.includes(st.class);
    });
    if (unassigned) {
      return res.status(403).json({ error: "Macallinku awood uma laha calaamadaynta fasal aan loo xilsaarin." });
    }
  }

  const { date, session_type, records } = req.body;
  if (!date || !Array.isArray(records)) return res.status(400).json({ error: "Date and records array required" });
  const sType = session_type || 'before_break';
  if (!useLocalFallback) {
    try {
      try {
        const { error: delError } = await supabase.from("dugsiga_attendance").delete().eq("date", date).eq("session_type", sType).eq("school_id", schoolId);
        if (delError) {
          if (delError.code === '42703' || (delError.message && delError.message.toLowerCase().includes('session_type'))) {
            const { error: delError2 } = await supabase.from("dugsiga_attendance").delete().eq("date", date).eq("school_id", schoolId);
            if (delError2) throw delError2;
          } else { throw delError; }
        }
      } catch (delErr: any) {
        const { error: delError2 } = await supabase.from("dugsiga_attendance").delete().eq("date", date).eq("school_id", schoolId);
        if (delError2) throw delError2;
      }
      const dbRecords = records.map(r => ({ school_id: schoolId, date: date, student_id: r.studentId, status: r.status, timestamp: r.timestamp }));
      if (dbRecords.length > 0) {
        try {
          const recordsWithSession = dbRecords.map(r => ({ ...r, session_type: sType }));
          const { error } = await supabase.from("dugsiga_attendance").insert(recordsWithSession);
          if (error) {
            if (error.code === '42703' || (error.message && error.message.toLowerCase().includes('session_type'))) {
              const { error: insertError } = await supabase.from("dugsiga_attendance").insert(dbRecords);
              if (insertError) throw insertError;
            } else { throw error; }
          }
        } catch (insertErr: any) {
          const { error: insertError } = await supabase.from("dugsiga_attendance").insert(dbRecords);
          if (insertError) throw insertError;
        }
      }
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Kaydinta Xaadirinta (Save Attendance)"); }
  } else {
    const db = loadLocalDB();
    db.attendance = (db.attendance || []).filter(a => !(a.schoolId === schoolId && a.date === date && (a.sessionType || 'before_break') === sType));
    records.forEach(r => { db.attendance.push({ schoolId, date, studentId: r.studentId, status: r.status, timestamp: r.timestamp, sessionType: sType }); });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.get("/api/fees", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_fees").select("*").eq("school_id", schoolId);
      if (error) throw error;
      const formatted = data.map(f => ({ id: f.id, studentId: f.student_id, month: f.month, year: f.year, amount: parseFloat(f.amount), paidAmount: parseFloat(f.paid_amount), status: f.status, createdAt: f.created_at, updatedAt: f.updated_at, history: f.history || [] }));
      return res.json(formatted);
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Biilasha (Fetch Fees)"); }
  } else {
    const db = loadLocalDB();
    const list = (db.fees || []).filter((f: any) => f.schoolId === schoolId);
    res.json(list);
  }
});

app.post("/api/fees", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (authUser?.role === "teacher") {
    return res.status(403).json({ error: "Macallimiintu awood uma laha abuurista biilasha ardayda." });
  }

  const fee = req.body;
  if (!fee.studentId || !fee.month || !fee.year) return res.status(400).json({ error: "Missing required fields" });
  
  const feeId = fee.id || 'fee-' + Math.random().toString(36).substring(2, 11);
  const createdAt = fee.createdAt || new Date().toISOString();
  const fullFee = { ...fee, id: feeId, createdAt };

  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_fees").select("id").eq("student_id", fee.studentId).eq("month", fee.month).eq("year", fee.year).eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Biilka bishan ee ardaygan horey ayaa loo abuuray. (Duplicate Fee Record)" });
      const { error } = await supabase.from("dugsiga_fees").insert([{ 
        id: feeId, 
        school_id: schoolId, 
        student_id: fee.studentId, 
        month: fee.month, 
        year: fee.year, 
        amount: fee.amount, 
        paid_amount: fee.paidAmount !== undefined ? fee.paidAmount : (fee.paid_amount || 0), 
        status: fee.status || 'unpaid', 
        created_at: createdAt, 
        updated_at: fee.updatedAt || createdAt, 
        history: fee.history || [] 
      }]);
      if (error) throw error;
      return res.json(fullFee);
    } catch (e: any) { return handleSupabaseError(res, e, "Abuurista Biilka (Create Fee)"); }
  } else {
    const db = loadLocalDB();
    const isDuplicate = (db.fees || []).some((f: any) => f.schoolId === schoolId && f.studentId === fee.studentId && f.month === fee.month && f.year === fee.year);
    if (isDuplicate) return res.status(400).json({ error: "Biilka bishan ee ardaygan horey ayaa loo abuuray. (Duplicate Fee Record)" });
    db.fees.push({ ...fullFee, schoolId });
    saveLocalDB(db);
    res.json(fullFee);
  }
});

app.put("/api/fees/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const authUser = getAuthenticatedUser(req, loadLocalDB);
  if (authUser?.role === "teacher") {
    return res.status(403).json({ error: "Macallimiintu awood uma laha wax ka beddelka biilasha ardayda." });
  }

  const { id } = req.params;
  const updates = req.body;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_fees").update({ month: updates.month, year: updates.year, amount: updates.amount, paid_amount: updates.paidAmount, status: updates.status, updated_at: updates.updatedAt, history: updates.history }).eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Cusbooneysiinta Biilka (Update Fee)"); }
  } else {
    const db = loadLocalDB();
    const idx = db.fees.findIndex(f => f.id === id && f.schoolId === schoolId);
    if (idx > -1) { db.fees[idx] = { ...db.fees[idx], ...updates }; saveLocalDB(db); return res.json({ success: true }); }
    res.status(404).json({ error: "Fee not found" });
  }
});

app.delete("/api/fees/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_fees").delete().eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Tirtirista Biilka (Delete Fee)"); }
  } else {
    const db = loadLocalDB();
    db.fees = db.fees.filter(f => !(f.id === id && f.schoolId === schoolId));
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.get("/api/classes", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_classes").select("*").eq("school_id", schoolId);
      if (error) throw error;
      const formatted = data.map(c => ({ id: c.id, className: c.class_name, teacherName: c.teacher_name, roomNumber: c.room_number, description: c.description, createdAt: c.created_at }));
      return res.json(formatted);
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Fasallada (Fetch Classes)"); }
  } else {
    const db = loadLocalDB();
    const list = (db.classes || []).filter((c: any) => c.schoolId === schoolId);
    res.json(list);
  }
});

app.post("/api/classes", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, className, teacherName, roomNumber, description, createdAt } = req.body;
  if (!className) return res.status(400).json({ error: "Class name is required" });
  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_classes").select("id").ilike("class_name", className.trim()).eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Fasalkan magacan leh horey ayaa loo diiwaangeliyey. (Duplicate Class)" });
      const { error } = await supabase.from("dugsiga_classes").insert([{ id: id || 'cls-' + Math.random().toString(36).substr(2, 9), school_id: schoolId, class_name: className.trim(), teacher_name: teacherName || "", room_number: roomNumber || "", description: description || "", created_at: createdAt || new Date().toISOString().split('T')[0] }]);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Kaydinta Fasalka (Save Class)"); }
  } else {
    const db = loadLocalDB();
    if (!db.classes) db.classes = [];
    const isDuplicate = db.classes.some(c => c.schoolId === schoolId && c.className.trim().toLowerCase() === className.trim().toLowerCase());
    if (isDuplicate) return res.status(400).json({ error: "Fasalkan magacan leh horey ayaa loo diiwaangeliyey. (Duplicate Class)" });
    db.classes.push({ id: id || 'cls-' + Math.random().toString(36).substr(2, 9), schoolId, className: className.trim(), teacherName: teacherName || "", roomNumber: roomNumber || "", description: description || "", createdAt: createdAt || new Date().toISOString().split('T')[0] });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.put("/api/classes/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  const { className, teacherName, roomNumber, description } = req.body;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_classes").update({ class_name: className, teacher_name: teacherName, room_number: roomNumber, description: description }).eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Cusbooneysiinta Fasalka (Update Class)"); }
  } else {
    const db = loadLocalDB();
    if (!db.classes) db.classes = [];
    const idx = db.classes.findIndex(c => c.id === id && c.schoolId === schoolId);
    if (idx > -1) { db.classes[idx] = { ...db.classes[idx], className, teacherName, roomNumber, description }; saveLocalDB(db); return res.json({ success: true }); }
    res.status(404).json({ error: "Class not found" });
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_classes").delete().eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Tirtirista Fasalka (Delete Class)"); }
  } else {
    const db = loadLocalDB();
    if (!db.classes) db.classes = [];
    db.classes = db.classes.filter(c => !(c.id === id && c.schoolId === schoolId));
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.get("/api/subjects", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_subjects").select("*").eq("school_id", schoolId);
      if (error) throw error;
      const formatted = data.map(s => ({ id: s.id, subjectName: s.subject_name, subjectCode: s.subject_code, className: s.class_name, teacherName: s.teacher_name, createdAt: s.created_at }));
      return res.json(formatted);
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Maddooyinka (Fetch Subjects)"); }
  } else {
    const db = loadLocalDB();
    const list = (db.subjects || []).filter((s: any) => s.schoolId === schoolId);
    res.json(list);
  }
});

app.post("/api/subjects", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, subjectName, subjectCode, className, teacherName, createdAt } = req.body;
  if (!subjectName) return res.status(400).json({ error: "Subject name is required" });
  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_subjects").select("id").ilike("subject_name", subjectName.trim()).eq("class_name", className || "").eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Maaddadan magacan leh horey ayaa loogu daray fasalkan. (Duplicate Subject)" });
      const { error } = await supabase.from("dugsiga_subjects").insert([{ id: id || 'sub-' + Math.random().toString(36).substr(2, 9), school_id: schoolId, subject_name: subjectName.trim(), subject_code: subjectCode || "", class_name: className || "", teacher_name: teacherName || "", created_at: createdAt || new Date().toISOString().split('T')[0] }]);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Kaydinta Maaddada (Save Subject)"); }
  } else {
    const db = loadLocalDB();
    if (!db.subjects) db.subjects = [];
    const isDuplicate = db.subjects.some(s => s.schoolId === schoolId && s.subjectName.trim().toLowerCase() === subjectName.trim().toLowerCase() && s.className === (className || ""));
    if (isDuplicate) return res.status(400).json({ error: "Maaddadan magacan leh horey ayaa loogu daray fasalkan. (Duplicate Subject)" });
    db.subjects.push({ id: id || 'sub-' + Math.random().toString(36).substr(2, 9), schoolId, subjectName: subjectName.trim(), subjectCode: subjectCode || "", className: className || "", teacherName: teacherName || "", createdAt: createdAt || new Date().toISOString().split('T')[0] });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.put("/api/subjects/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  const { subjectName, subjectCode, className, teacherName } = req.body;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_subjects").update({ subject_name: subjectName, subject_code: subjectCode, class_name: className, teacher_name: teacherName }).eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Cusbooneysiinta Maaddada (Update Subject)"); }
  } else {
    const db = loadLocalDB();
    if (!db.subjects) db.subjects = [];
    const idx = db.subjects.findIndex(s => s.id === id && s.schoolId === schoolId);
    if (idx > -1) { db.subjects[idx] = { ...db.subjects[idx], subjectName, subjectCode, className, teacherName }; saveLocalDB(db); return res.json({ success: true }); }
    res.status(404).json({ error: "Subject not found" });
  }
});

app.delete("/api/subjects/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_subjects").delete().eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Tirtirista Maaddada (Delete Subject)"); }
  } else {
    const db = loadLocalDB();
    if (!db.subjects) db.subjects = [];
    db.subjects = db.subjects.filter(s => !(s.id === id && s.schoolId === schoolId));
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.get("/api/exams", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_exam_scores").select("*").eq("school_id", schoolId);
      if (error) throw error;
      const formatted = data.map(e => ({ id: e.id, studentId: e.student_id, studentName: e.student_name, className: e.class_name, subjectName: e.subject_name, examName: e.exam_name, term: e.term, maxMarks: Number(e.max_marks || 100), marksObtained: Number(e.marks_obtained), grade: e.grade, examDate: e.exam_date, createdAt: e.created_at }));
      return res.json(formatted);
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Imtixaanada (Fetch Exams)"); }
  } else {
    const db = loadLocalDB();
    const list = (db.examScores || []).filter((e: any) => e.schoolId === schoolId);
    res.json(list);
  }
});

app.post("/api/exams", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, studentId, studentName, className, subjectName, examName, term, maxMarks, marksObtained, grade, examDate, createdAt } = req.body;
  if (!studentId || !className || !subjectName || !examName || marksObtained === undefined) return res.status(400).json({ error: "Missing required fields for exam score recording" });
  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_exam_scores").select("id").eq("student_id", studentId).eq("subject_name", subjectName).eq("exam_name", examName).eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Natiijadan imtixaanka ee ardaygan horey ayaa loo duubay. (Duplicate Exam Score)" });
      const { error } = await supabase.from("dugsiga_exam_scores").insert([{ id: id || 'exm-' + Math.random().toString(36).substr(2, 9), school_id: schoolId, student_id: studentId, student_name: studentName || "", class_name: className, subject_name: subjectName, exam_name: examName, term: term || "Term 1", max_marks: maxMarks || 100, marks_obtained: marksObtained, grade: grade || "", exam_date: examDate || new Date().toISOString().split('T')[0], created_at: createdAt || new Date().toISOString().split('T')[0] }]);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Kaydinta Natiijada Imtixaanka (Save Exam Score)"); }
  } else {
    const db = loadLocalDB();
    if (!db.examScores) db.examScores = [];
    const isDuplicate = db.examScores.some(e => e.schoolId === schoolId && e.studentId === studentId && e.subjectName === subjectName && e.examName === examName);
    if (isDuplicate) return res.status(400).json({ error: "Natiijadan imtixaanka ee ardaygan horey ayaa loo duubay. (Duplicate Exam Score)" });
    db.examScores.push({ id: id || 'exm-' + Math.random().toString(36).substr(2, 9), schoolId, studentId, studentName: studentName || "", className, subjectName, examName, term: term || "Term 1", maxMarks: maxMarks || 100, marksObtained, grade: grade || "", examDate: examDate || new Date().toISOString().split('T')[0], createdAt: createdAt || new Date().toISOString().split('T')[0] });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.put("/api/exams/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  const { studentId, studentName, className, subjectName, examName, term, maxMarks, marksObtained, grade, examDate } = req.body;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_exam_scores").update({ student_id: studentId, student_name: studentName, class_name: className, subject_name: subjectName, exam_name: examName, term: term, max_marks: maxMarks, marks_obtained: marksObtained, grade: grade, exam_date: examDate }).eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Cusbooneysiinta Natiijada Imtixaanka (Update Exam Score)"); }
  } else {
    const db = loadLocalDB();
    if (!db.examScores) db.examScores = [];
    const idx = db.examScores.findIndex(e => e.id === id && e.schoolId === schoolId);
    if (idx > -1) { db.examScores[idx] = { ...db.examScores[idx], studentId, studentName, className, subjectName, examName, term, maxMarks, marksObtained, grade, examDate }; saveLocalDB(db); return res.json({ success: true }); }
    res.status(404).json({ error: "Exam score record not found" });
  }
});

app.delete("/api/exams/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_exam_scores").delete().eq("id", id).eq("school_id", schoolId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Tirtirista Natiijada (Delete Exam Score)"); }
  } else {
    const db = loadLocalDB();
    if (!db.examScores) db.examScores = [];
    db.examScores = db.examScores.filter(e => !(e.id === id && e.schoolId === schoolId));
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.get("/api/settings", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_settings").select("*").eq("school_id", schoolId).eq("key", "main_settings").single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) return res.json(data.value);
      return res.json({ ...defaultSettings, schoolName: schoolId.includes("@") ? schoolId.split("@")[0].toUpperCase() : "Dugsiga Pro 2026" });
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Qaabeynta (Fetch Settings)"); }
  } else {
    const db = loadLocalDB();
    if (!db.settings || typeof db.settings.schoolName === 'string') {
      const oldVal = db.settings || defaultSettings;
      db.settings = { "default-school": oldVal };
    }
    const schoolSettings = db.settings[schoolId] || { ...defaultSettings, schoolName: schoolId.includes("@") ? schoolId.split("@")[0].toUpperCase() : "Dugsiga Pro 2026" };
    res.json(schoolSettings);
  }
});

app.put("/api/settings", async (req, res) => {
  const schoolId = getSchoolId(req);
  const settings = req.body;
  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_settings").upsert({ school_id: schoolId, key: "main_settings", value: settings });
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Kaydinta Qaabeynta (Update Settings)"); }
  } else {
    const db = loadLocalDB();
    if (!db.settings || typeof db.settings.schoolName === 'string') {
      const oldVal = db.settings || defaultSettings;
      db.settings = { "default-school": oldVal };
    }
    db.settings[schoolId] = { ...(db.settings[schoolId] || defaultSettings), ...settings };
    saveLocalDB(db);
    res.json({ success: true });
  }
});

// Register Modernization & Extension Routes (Teachers, Staff, Guardians, Attendance, Timetable, Admissions, Library, Inventory, Announcements, Reports, RBAC)
registerModernRoutes(app, {
  getSchoolId,
  loadLocalDB,
  saveLocalDB,
  supabase,
  getUseLocalFallback: () => useLocalFallback,
  hasPermission,
  handleSupabaseError
});

// Register Complete Finance & Accounting Suite
registerFinanceRoutes(app, {
  getSchoolId,
  loadLocalDB,
  saveLocalDB,
  supabase,
  getUseLocalFallback: () => useLocalFallback,
  hasPermission,
  handleSupabaseError
});

app.post("/api/reset", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { error: err1 } = await supabase.from("dugsiga_students").delete().eq("school_id", schoolId);
      if (err1) throw err1;
      const { error: err2 } = await supabase.from("dugsiga_fees").delete().eq("school_id", schoolId);
      if (err2) throw err2;
      const { error: err3 } = await supabase.from("dugsiga_attendance").delete().eq("school_id", schoolId);
      if (err3) throw err3;
      const { error: err4 } = await supabase.from("dugsiga_exam_scores").delete().eq("school_id", schoolId);
      if (err4) throw err4;
      const { error: err5 } = await supabase.from("dugsiga_classes").delete().eq("school_id", schoolId);
      if (err5) throw err5;
      const { error: err6 } = await supabase.from("dugsiga_subjects").delete().eq("school_id", schoolId);
      if (err6) throw err6;
      const { error: err7 } = await supabase.from("dugsiga_settings").delete().eq("school_id", schoolId).eq("key", "main_settings");
      if (err7) throw err7;
    } catch (e: any) { return handleSupabaseError(res, e, "Factory Reset"); }
  }
  const db = loadLocalDB();
  db.students = (db.students || []).filter((s: any) => s.schoolId !== schoolId);
  db.fees = (db.fees || []).filter((f: any) => f.schoolId !== schoolId);
  db.attendance = (db.attendance || []).filter((a: any) => a.schoolId !== schoolId);
  db.examScores = (db.examScores || []).filter((e: any) => e.schoolId !== schoolId);
  db.classes = (db.classes || []).filter((c: any) => c.schoolId !== schoolId);
  db.subjects = (db.subjects || []).filter((s: any) => s.schoolId !== schoolId);
  if (db.teachers) db.teachers = db.teachers.filter((t: any) => t.schoolId !== schoolId);
  if (db.staff) db.staff = db.staff.filter((s: any) => s.schoolId !== schoolId);
  if (db.guardians) db.guardians = db.guardians.filter((g: any) => g.schoolId !== schoolId);
  if (db.staffAttendance) db.staffAttendance = db.staffAttendance.filter((a: any) => a.schoolId !== schoolId);
  if (db.timetable) db.timetable = db.timetable.filter((t: any) => t.schoolId !== schoolId);
  if (db.admissions) db.admissions = db.admissions.filter((a: any) => a.schoolId !== schoolId);
  if (db.announcements) db.announcements = db.announcements.filter((a: any) => a.schoolId !== schoolId);
  if (db.libraryBooks) db.libraryBooks = db.libraryBooks.filter((b: any) => b.schoolId !== schoolId);
  if (db.libraryLoans) db.libraryLoans = db.libraryLoans.filter((l: any) => l.schoolId !== schoolId);
  if (db.inventory) db.inventory = db.inventory.filter((i: any) => i.schoolId !== schoolId);
  if (db.documents) db.documents = db.documents.filter((d: any) => d.schoolId !== schoolId);
  if (db.notifications) db.notifications = db.notifications.filter((n: any) => n.schoolId !== schoolId);
  if (db.feeStructures) db.feeStructures = db.feeStructures.filter((fs: any) => fs.schoolId !== schoolId);
  if (db.invoices) db.invoices = db.invoices.filter((inv: any) => inv.schoolId !== schoolId);
  if (db.payments) db.payments = db.payments.filter((p: any) => p.schoolId !== schoolId);
  if (db.expenses) db.expenses = db.expenses.filter((e: any) => e.schoolId !== schoolId);
  if (db.income) db.income = db.income.filter((inc: any) => inc.schoolId !== schoolId);
  if (db.budgets) db.budgets = db.budgets.filter((b: any) => b.schoolId !== schoolId);
  if (db.payroll) db.payroll = db.payroll.filter((pr: any) => pr.schoolId !== schoolId);
  if (db.settings && typeof db.settings === 'object' && !db.settings.schoolName) {
    delete db.settings[schoolId];
  } else {
    db.settings = {};
  }
  saveLocalDB(db);
  res.json({ success: true });
});

async function startServer() {
  app.use(express.static(path.join(process.cwd(), "public")));

  const distPath = path.join(process.cwd(), "dist");
  const distIndexHtml = path.join(distPath, "index.html");
  const isDevLifecycle =
    process.env.npm_lifecycle_event === "dev" ||
    process.env.NODE_ENV === "development";
  const useStaticDist = !isDevLifecycle && fs.existsSync(distIndexHtml);

  if (!useStaticDist) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (fs.existsSync(distIndexHtml)) {
        res.sendFile(distIndexHtml);
      } else {
        res.status(404).send("Application build not found.");
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});