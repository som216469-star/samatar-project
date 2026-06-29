import express from "express";
import path from "path";
import fs from "fs";
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

// Initialize Supabase Client
const supabaseUrl = parseSupabaseUrl(process.env.SUPABASE_URL || "https://mdvfcqujqjnvfpzowayo.supabase.co");
const supabaseAnonKey = sanitizeEnvValue(process.env.SUPABASE_ANON_KEY || "");
const supabaseSecretKey = sanitizeEnvValue(process.env.SUPABASE_SECRET_KEY || "");
const supabaseActiveKey = supabaseSecretKey || supabaseAnonKey;

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

let useLocalFallback = true;
let customSupabaseActive = false;

function handleSupabaseError(res: any, error: any, context: string) {
  console.error(`Supabase error during "${context}":`, error);
  const message = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
  return res.status(500).json({
    error: `Supabase Error (${context}): ${message}. Fadlan hubi in aad SQL script-ka ku dhex ordaysay Supabase SQL Editor-kaaga.`
  });
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
    
    if (studentsExist && attendanceExists && classesExist && subjectsExist && examsExist && feesExist && settingsExist) {
      useLocalFallback = false;
      customSupabaseActive = true;
      console.log("Supabase connected and tables found. Operating in direct Supabase mode.");
    } else {
      useLocalFallback = true;
      customSupabaseActive = false;
      console.log("Supabase tables missing, outdated, or inaccessible. Falling back to local database mode.");
    }
  } catch (err) {
    useLocalFallback = true;
    customSupabaseActive = false;
    console.log("Error checking Supabase tables, falling back to local database mode:", err);
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

-- Disable Row Level Security
ALTER TABLE dugsiga_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_exam_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_settings DISABLE ROW LEVEL SECURITY;
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
    const customKey = sanitizeEnvValue(process.env.SUPABASE_ANON_KEY || "");
    const normalizedCustomUrl = parseSupabaseUrl(process.env.SUPABASE_URL || "");
    const hasCustomUrl = normalizedCustomUrl !== "" &&
                         normalizedCustomUrl !== "https://mdvfcqujqjnvfpzowayo.supabase.co" &&
                         normalizedCustomUrl !== "https://your_supabase_project_url";
    const hasCustomKey = customKey !== "" &&
                         customKey !== "your_supabase_anon_key" &&
                         customKey !== "your-anon-key";
    res.json({
      connected: !useLocalFallback || customSupabaseActive,
      fallbackMode: useLocalFallback,
      customSupabaseActive: customSupabaseActive,
      customSupabaseConfigured: hasCustomUrl && hasCustomKey,
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
  const passwordHash = simpleHash(password);
  if (!useLocalFallback) {
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from("dugsiga_users").select("email").eq("email", email).single();
      if (checkError && checkError.code !== "PGRST116") throw checkError;
      if (existingUser) return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey." });
      const { error } = await supabase.from("dugsiga_users").insert([{
        email, password: passwordHash, verified: true
      }]);
      if (error) throw error;
    } catch (e: any) {
      return handleSupabaseError(res, e, "Diiwaangelinta (Signup)");
    }
  } else {
    const db = loadLocalDB();
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey." });
    db.users.push({ email, password_hash: passwordHash, verified: true });
    saveLocalDB(db);
  }
  res.json({ success: true, message: "Diiwaangelintu way guuleysatay! Hadda geli kartaa.", emailSent: false });
});

app.post("/api/auth/verify", async (req, res) => {
  res.json({ success: true, message: "Verification step is disabled. Automated success." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Fadlan geli email iyo password." });
  const passwordHash = simpleHash(password);
  let userRecord: any = null;
  if (!useLocalFallback) {
    try {
      const { data: user, error } = await supabase.from("dugsiga_users").select("*").eq("email", email).single();
      if (error) {
        if (error.code === "PGRST116") return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
        throw error;
      }
      if (!user) return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
      userRecord = user;
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo galidda (Login)");
    }
  } else {
    const db = loadLocalDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
    userRecord = { email: user.email, password: user.password_hash, verified: user.verified };
  }
  if (userRecord.password !== passwordHash) return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
  res.json({ success: true, user: { email: userRecord.email } });
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
  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_students").select("id").ilike("full_name", student.fullName.trim()).eq("class", student.class).eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Ardaygan magacan leh horey ayaa loogu diiwaangeliyey fasalkan. (Duplicate Student)" });
      
      const insertObj: any = {
        id: student.id,
        school_id: schoolId,
        full_name: student.fullName.trim(),
        class: student.class,
        gender: student.gender,
        guardian_phone: student.guardianPhone,
        status: student.status,
        created_at: student.createdAt,
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
      return res.json(student);
    } catch (e: any) { return handleSupabaseError(res, e, "Diiwaangelinta Ardayga (Add Student)"); }
  } else {
    const db = loadLocalDB();
    const isDuplicate = (db.students || []).some((s: any) => s.schoolId === schoolId && s.fullName.trim().toLowerCase() === student.fullName.trim().toLowerCase() && s.class === student.class);
    if (isDuplicate) return res.status(400).json({ error: "Ardaygan magacan leh horey ayaa loogu diiwaangeliyey fasalkan. (Duplicate Student)" });
    db.students.push({ ...student, schoolId, fullName: student.fullName.trim() });
    saveLocalDB(db);
    res.json(student);
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
  if (!useLocalFallback) {
    try {
      const { data: existing, error: checkError } = await supabase.from("dugsiga_fees").select("id").eq("student_id", fee.studentId).eq("month", fee.month).eq("year", fee.year).eq("school_id", schoolId).limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) return res.status(400).json({ error: "Biilka bishan ee ardaygan horey ayaa loo abuuray. (Duplicate Fee Record)" });
      const { error } = await supabase.from("dugsiga_fees").insert([{ id: fee.id, school_id: schoolId, student_id: fee.studentId, month: fee.month, year: fee.year, amount: fee.amount, paid_amount: fee.paidAmount, status: fee.status, created_at: fee.createdAt, updated_at: fee.updatedAt, history: fee.history }]);
      if (error) throw error;
      return res.json(fee);
    } catch (e: any) { return handleSupabaseError(res, e, "Abuurista Biilka (Create Fee)"); }
  } else {
    const db = loadLocalDB();
    const isDuplicate = (db.fees || []).some((f: any) => f.schoolId === schoolId && f.studentId === fee.studentId && f.month === fee.month && f.year === fee.year);
    if (isDuplicate) return res.status(400).json({ error: "Biilka bishan ee ardaygan horey ayaa loo abuuray. (Duplicate Fee Record)" });
    db.fees.push({ ...fee, schoolId });
    saveLocalDB(db);
    res.json(fee);
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