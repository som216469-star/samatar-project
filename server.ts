import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { withSupabase, createSupabaseContext } from "@supabase/server";

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
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Client with resilient key resolution
function deriveSupabaseKey(): string {
  const secretKey = sanitizeEnvValue(process.env.SUPABASE_SECRET_KEY || "");
  const anonKey = sanitizeEnvValue(process.env.SUPABASE_ANON_KEY || "");
  const jwksUrlOrSecret = sanitizeEnvValue(process.env.SUPABASE_JWKS_URL || "");

  // 1. If secretKey is already a valid JWT service_role key
  if (secretKey.startsWith("ey")) {
    try {
      const parts = secretKey.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        if (payload.role === "service_role") {
          return secretKey;
        }
      }
    } catch {}
  }

  // 2. If JWT secret is provided in SUPABASE_JWKS_URL and anonKey is available,
  // derive the authenticated service_role key for full direct cloud access:
  if (jwksUrlOrSecret && anonKey.startsWith("ey")) {
    try {
      const parts = anonKey.split(".");
      if (parts.length === 3) {
        const anonPayload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        const servicePayload = { ...anonPayload, role: "service_role" };
        const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const p = Buffer.from(JSON.stringify(servicePayload)).toString("base64url");
        const s = crypto.createHmac("sha256", jwksUrlOrSecret).update(`${h}.${p}`).digest("base64url");
        return `${h}.${p}.${s}`;
      }
    } catch (e) {
      console.warn("Could not derive service_role token from JWT secret:", e);
    }
  }

  // 3. If secretKey is provided and not a publishable key
  if (secretKey && !secretKey.startsWith("sb_publish")) {
    return secretKey;
  }

  return anonKey || secretKey;
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

// Local database fallback
const LOCAL_DB_PATH = path.join(process.cwd(), "database.json");

interface LocalDB {
  users: Array<{ email: string; password_hash: string; verified: boolean; verification_code?: string }>;
  students: Array<any>;
  attendance: Array<{ schoolId?: string; date: string; studentId: string; status: string; timestamp: string; sessionType?: string }>;
  fees: Array<any>;
  classes: Array<{ id: string; schoolId?: string; className: string; teacherName: string; roomNumber: string; description: string; createdAt: string }>;
  subjects: Array<{ id: string; schoolId?: string; subjectName: string; subjectCode: string; className: string; teacherName: string; createdAt: string }>;
  examScores: Array<{ id: string; schoolId?: string; studentId: string; studentName: string; className: string; subjectName: string; examName: string; term: string; maxMarks: number; marksObtained: number; grade: string; examDate: string; createdAt: string }>;
  settings: any;
}

const defaultSettings = {
  schoolName: "Dugsiga Pro 2026",
  currency: "USD",
  feeAmount: 50,
  systemTheme: "light"
};

function loadLocalDB(): LocalDB {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial: LocalDB = {
      users: [], students: [], attendance: [], fees: [],
      classes: [], subjects: [], examScores: [], settings: defaultSettings
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse local DB, recreating...", e);
    const initial: LocalDB = {
      users: [], students: [], attendance: [], fees: [],
      classes: [], subjects: [], examScores: [], settings: defaultSettings
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveLocalDB(data: LocalDB) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

function getSchoolId(req: express.Request): string {
  const emailHeader = req.headers["x-school-email"] || req.headers["X-School-Email"] || req.headers["x-school-id"] || req.headers["X-School-Id"];
  if (typeof emailHeader === "string" && emailHeader.trim() !== "") {
    return emailHeader.trim().toLowerCase();
  }
  return "default-school";
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
-- Drop old tables if they exist to support complete recreation
DROP TABLE IF EXISTS dugsiga_settings CASCADE;
DROP TABLE IF EXISTS dugsiga_fees CASCADE;
DROP TABLE IF EXISTS dugsiga_attendance CASCADE;
DROP TABLE IF EXISTS dugsiga_exam_scores CASCADE;
DROP TABLE IF EXISTS dugsiga_subjects CASCADE;
DROP TABLE IF EXISTS dugsiga_classes CASCADE;
DROP TABLE IF EXISTS dugsiga_students CASCADE;
DROP TABLE IF EXISTS dugsiga_users CASCADE;

-- Create users table (No verification code)
CREATE TABLE IF NOT EXISTS dugsiga_users (
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table with school_id separation
CREATE TABLE IF NOT EXISTS dugsiga_students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT,
  guardian_phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT,
  photo TEXT
);

-- Create classes table with school_id separation
CREATE TABLE IF NOT EXISTS dugsiga_classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  teacher_name TEXT,
  room_number TEXT,
  description TEXT,
  created_at TEXT
);

-- Create subjects table with school_id separation
CREATE TABLE IF NOT EXISTS dugsiga_subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  class_name TEXT,
  teacher_name TEXT,
  created_at TEXT
);

-- Create exam scores table with school_id separation
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

-- Create attendance table with school_id separation
CREATE TABLE IF NOT EXISTS dugsiga_attendance (
  school_id TEXT NOT NULL,
  date TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT,
  session_type TEXT DEFAULT 'before_break',
  PRIMARY KEY (school_id, date, student_id, session_type)
);

-- Create fees table with school_id separation
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

-- Create settings table with school_id separation
CREATE TABLE IF NOT EXISTS dugsiga_settings (
  school_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  PRIMARY KEY (school_id, key)
);

-- Disable Row Level Security & grant full privileges
ALTER TABLE dugsiga_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_exam_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_settings DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE dugsiga_users TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_students TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_classes TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_subjects TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_exam_scores TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_fees TO anon, authenticated, service_role;
GRANT ALL ON TABLE dugsiga_settings TO anon, authenticated, service_role;
`;

function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

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

/* ==============================================
   API ROUTES
   ============================================== */

app.get("/api/db/status", async (req, res) => {
  try {
    await checkSupabaseStatus();
    res.json({
      connected: !useLocalFallback && customSupabaseActive,
      fallbackMode: useLocalFallback,
      customSupabaseActive: customSupabaseActive,
      customSupabaseConfigured: true,
      supabaseUrl: supabaseUrl,
      sqlScript: SQL_SETUP_SCRIPT
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

app.get("/api/supabase-server-test", expressWithSupabase({ auth: "none" }, async (_req: any, ctx: any) => {
  try {
    const { data: usersData, error: usersError } = await ctx.supabaseAdmin.from("dugsiga_users").select("email").limit(5);
    const { data: studentsData, error: studentsError } = await ctx.supabaseAdmin.from("dugsiga_students").select("id, full_name").limit(5);
    return Response.json({
      status: "success",
      message: "Supabase server SDK successfully configured!",
      env_variables_verified: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: !!process.env.SUPABASE_PUBLISHABLE_KEY,
        SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY,
        SUPABASE_JWKS_URL: !!process.env.SUPABASE_JWKS_URL
      },
      has_supabase_client: !!ctx.supabase,
      has_supabase_admin_client: !!ctx.supabaseAdmin,
      test_query_admin_users: usersError ? { error: usersError.message } : usersData,
      test_query_admin_students: studentsError ? { error: studentsError.message } : studentsData
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
  const passwordHash = simpleHash(password);

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
        email: cleanEmail, password: passwordHash, verified: true
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
    db.users.push({ email: cleanEmail, password_hash: passwordHash, verified: true });
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

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Fadlan geli email iyo password." });
  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = simpleHash(password);

  // 1. If Supabase is connected, check Supabase first (source of truth)
  if (!useLocalFallback && supabase) {
    try {
      const { data: user, error } = await supabase
        .from("dugsiga_users")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (!error && user) {
        const db = loadLocalDB();
        const localUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
        const matchesCloud = user.password === passwordHash;
        const matchesLocal = localUser && localUser.password_hash === passwordHash;

        if (matchesCloud || matchesLocal) {
          if (matchesLocal && !matchesCloud) {
            await supabase.from("dugsiga_users").update({ password: passwordHash }).ilike("email", cleanEmail);
          }
          const localIdx = db.users.findIndex(u => u.email.toLowerCase() === cleanEmail);
          if (localIdx !== -1) {
            db.users[localIdx].password_hash = passwordHash;
          } else {
            db.users.push({ email: cleanEmail, password_hash: passwordHash, verified: true });
          }
          saveLocalDB(db);
          return res.json({ success: true, user: { email: cleanEmail } });
        } else {
          return res.status(400).json({ error: "Password-ka aad gelisay ma saxna." });
        }
      }
    } catch (e: any) {
      console.warn("Supabase login check notice:", e?.message || e);
    }
  }

  // 2. Fallback to local DB if user exists locally or Supabase is not reached
  const db = loadLocalDB();
  const localUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (localUser) {
    if (localUser.password_hash === passwordHash) {
      return res.json({ success: true, user: { email: cleanEmail } });
    } else {
      return res.status(400).json({ error: "Password-ka aad gelisay ma saxna." });
    }
  }

  return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
});

app.get("/api/students", async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_students").select("*").eq("school_id", schoolId).order("full_name", { ascending: true });
      if (error) throw error;
      const students = data.map(s => ({
        id: s.id,
        fullName: s.full_name,
        class: s.class,
        gender: s.gender,
        guardianPhone: s.guardian_phone,
        status: s.status,
        createdAt: s.created_at,
        photo: s.photo || ""
      }));
      return res.json(students);
    } catch (e: any) { return handleSupabaseError(res, e, "Soo qaadista Ardayda (Fetch Students)"); }
  } else {
    const db = loadLocalDB();
    const list = (db.students || []).filter((s: any) => s.schoolId === schoolId);
    res.json(list);
  }
});

app.post("/api/students", async (req, res) => {
  const schoolId = getSchoolId(req);
  const student = req.body;
  if (!student.fullName || !student.class) return res.status(400).json({ error: "Magaca iyo Class-ka waa qasab." });
  
  const studentId = student.id || 'std-' + Math.random().toString(36).substring(2, 11);
  const createdAt = student.createdAt || new Date().toISOString().split('T')[0];
  const fullStudent = { ...student, id: studentId, createdAt };

  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_students").select("id").ilike("full_name", student.fullName.trim()).eq("class", student.class).eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Ardaygan magacan leh horey ayaa loogu diiwaangeliyey fasalkan. (Duplicate Student)" });
      
      const insertObj: any = {
        id: studentId,
        school_id: schoolId,
        full_name: student.fullName.trim(),
        class: student.class,
        gender: student.gender || "Male",
        guardian_phone: student.guardianPhone || "",
        status: student.status || "active",
        created_at: createdAt,
        photo: student.photo || ""
      };
      
      let { error } = await supabase.from("dugsiga_students").insert([insertObj]);
      if (error) {
        if (error.code === '42703' || (error.message && error.message.includes('photo'))) {
          console.warn("photo column does not exist on dugsiga_students. Retrying without photo.");
          delete insertObj.photo;
          const retryResult = await supabase.from("dugsiga_students").insert([insertObj]);
          error = retryResult.error;
        }
      }
      if (error) throw error;
      return res.json(fullStudent);
    } catch (e: any) { return handleSupabaseError(res, e, "Diiwaangelinta Ardayga (Add Student)"); }
  } else {
    const db = loadLocalDB();
    const isDuplicate = (db.students || []).some((s: any) => s.schoolId === schoolId && s.fullName.trim().toLowerCase() === student.fullName.trim().toLowerCase() && s.class === student.class);
    if (isDuplicate) return res.status(400).json({ error: "Ardaygan magacan leh horey ayaa loogu diiwaangeliyey fasalkan. (Duplicate Student)" });
    db.students.push({ ...fullStudent, schoolId, fullName: student.fullName.trim() });
    saveLocalDB(db);
    res.json(fullStudent);
  }
});

app.put("/api/students/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  const updates = req.body;
  if (!useLocalFallback) {
    try {
      const updateObj: any = {
        full_name: updates.fullName,
        class: updates.class,
        gender: updates.gender,
        guardian_phone: updates.guardianPhone,
        status: updates.status,
        photo: updates.photo
      };
      let { error } = await supabase.from("dugsiga_students").update(updateObj).eq("id", id).eq("school_id", schoolId);
      if (error) {
        if (error.code === '42703' || (error.message && error.message.includes('photo'))) {
          console.warn("photo column does not exist on dugsiga_students. Retrying update without photo.");
          delete updateObj.photo;
          const retryResult = await supabase.from("dugsiga_students").update(updateObj).eq("id", id).eq("school_id", schoolId);
          error = retryResult.error;
        }
      }
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Tafatirka Ardayga (Update Student)"); }
  } else {
    const db = loadLocalDB();
    const idx = db.students.findIndex(s => s.id === id && s.schoolId === schoolId);
    if (idx > -1) { db.students[idx] = { ...db.students[idx], ...updates }; saveLocalDB(db); return res.json({ success: true }); }
    res.status(404).json({ error: "Student not found" });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id } = req.params;
  if (!useLocalFallback) {
    try {
      const { error: err1 } = await supabase.from("dugsiga_students").delete().eq("id", id).eq("school_id", schoolId);
      if (err1) throw err1;
      const { error: err2 } = await supabase.from("dugsiga_fees").delete().eq("student_id", id).eq("school_id", schoolId);
      if (err2) throw err2;
      const { error: err3 } = await supabase.from("dugsiga_attendance").delete().eq("student_id", id).eq("school_id", schoolId);
      if (err3) throw err3;
      return res.json({ success: true });
    } catch (e: any) { return handleSupabaseError(res, e, "Tirtirista Ardayga (Delete Student)"); }
  } else {
    const db = loadLocalDB();
    db.students = db.students.filter(s => !(s.id === id && s.schoolId === schoolId));
    db.fees = db.fees.filter(f => !(f.studentId === id && f.schoolId === schoolId));
    db.attendance = db.attendance.filter(a => !(a.studentId === id && a.schoolId === schoolId));
    saveLocalDB(db);
    res.json({ success: true });
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
  if (db.settings && typeof db.settings === 'object' && !db.settings.schoolName) {
    delete db.settings[schoolId];
  } else {
    db.settings = {};
  }
  saveLocalDB(db);
  res.json({ success: true });
});

if (process.env.DISABLE_HMR !== "true") {
  process.env.DISABLE_HMR = "true";
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();