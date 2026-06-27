import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
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

// Robust helper to sanitize environment variables (removing single/double quotes, trailing spaces, etc.)
function sanitizeEnvValue(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  // Strip starting/ending quotes if any (single or double)
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

// Helper to parse and fully normalize Supabase URL (e.g., mdvfcqujqjnvfpzowayo -> https://mdvfcqujqjnvfpzowayo.supabase.co)
function parseSupabaseUrl(url: string | undefined): string {
  let clean = sanitizeEnvValue(url);
  if (!clean) return "";
  
  // Remove any leading http:// or https:// temporarily to inspect the hostname
  let isSecure = true;
  if (clean.toLowerCase().startsWith("https://")) {
    clean = clean.slice(8);
  } else if (clean.toLowerCase().startsWith("http://")) {
    clean = clean.slice(7);
    isSecure = false;
  }
  
  // Remove any trailing slashes or paths
  const slashIdx = clean.indexOf("/");
  if (slashIdx !== -1) {
    clean = clean.slice(0, slashIdx);
  }
  
  // Append standard supabase.co suffix if it's just a bare project reference (no dot)
  if (clean && !clean.includes(".")) {
    clean = clean + ".supabase.co";
  }
  
  return (isSecure ? "https://" : "http://") + clean;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Client with sanitized values
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

// Initialize Nodemailer SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "som216469@gmail.com",
    pass: process.env.SMTP_PASS || "sgnxblsftqlofisf",
  },
});

const SMTP_FROM = process.env.SMTP_FROM || "som216469@gmail.com";

// Local database fallback file paths
const LOCAL_DB_PATH = path.join(process.cwd(), "database.json");

// Define type for local db state
interface LocalDB {
  users: Array<{ email: string; password_hash: string; verified: boolean; verification_code: string }>;
  students: Array<any>;
  attendance: Array<{ date: string; studentId: string; status: string; timestamp: string; sessionType?: string }>;
  fees: Array<any>;
  classes: Array<{ id: string; className: string; teacherName: string; roomNumber: string; description: string; createdAt: string }>;
  subjects: Array<{ id: string; subjectName: string; subjectCode: string; className: string; teacherName: string; createdAt: string }>;
  examScores: Array<{ id: string; studentId: string; studentName: string; className: string; subjectName: string; examName: string; term: string; maxMarks: number; marksObtained: number; grade: string; examDate: string; createdAt: string }>;
  settings: any;
}

// Initial default settings
const defaultSettings = {
  schoolName: "Dugsiga Pro 2026",
  currency: "USD",
  feeAmount: 50,
  systemTheme: "light"
};

// Helper to load local database
function loadLocalDB(): LocalDB {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial: LocalDB = {
      users: [],
      students: [],
      attendance: [],
      fees: [],
      classes: [],
      subjects: [],
      examScores: [],
      settings: defaultSettings
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
      users: [],
      students: [],
      attendance: [],
      fees: [],
      classes: [],
      subjects: [],
      examScores: [],
      settings: defaultSettings
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

// Helper to save local database
function saveLocalDB(data: LocalDB) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

// Helper to test if a Supabase table is accessible
async function testSupabaseTable(tableName: string): Promise<boolean> {
  if (!supabaseActiveKey || !supabase) return false;
  try {
    const { error } = await supabase.from(tableName).select().limit(1);
    if (error) {
      // If table does not exist or permission denied
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Global flag to track Supabase table health and fallback (safe default to local fallback)
let useLocalFallback = true; 
let customSupabaseActive = false;

// Helper function to return standardized Supabase database errors to the frontend
function handleSupabaseError(res: any, error: any, context: string) {
  console.error(`Supabase error during "${context}":`, error);
  const message = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
  return res.status(500).json({
    error: `Supabase Error (${context}): ${message}. Fadlan hubi in aad SQL script-ka ku dhex ordaysay Supabase SQL Editor-kaaga.`
  });
}

// Dynamic check on startup & periodically
async function checkSupabaseStatus() {
  if (!supabaseUrl || !supabaseActiveKey || !supabase) {
    useLocalFallback = true;
    customSupabaseActive = false;
    console.log("Supabase not fully configured. Using local database fallback.");
    return;
  }

  try {
    // Check if critical tables exist
    const studentsExist = await testSupabaseTable("dugsiga_students");
    const attendanceExists = await testSupabaseTable("dugsiga_attendance");

    if (studentsExist && attendanceExists) {
      useLocalFallback = false;
      customSupabaseActive = true;
      console.log("Supabase connected and tables found. Operating in direct Supabase mode.");
    } else {
      useLocalFallback = true;
      customSupabaseActive = false;
      console.log("Supabase tables missing or inaccessible. Falling back to local database mode.");
    }
  } catch (err) {
    useLocalFallback = true;
    customSupabaseActive = false;
    console.log("Error checking Supabase tables, falling back to local database mode:", err);
  }
}

// Run initial status check
checkSupabaseStatus();

// SQL Setup Script for user
const SQL_SETUP_SCRIPT = `
-- Create users table
CREATE TABLE IF NOT EXISTS dugsiga_users (
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS dugsiga_students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT,
  guardian_phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT
);

-- Create classes table
CREATE TABLE IF NOT EXISTS dugsiga_classes (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL UNIQUE,
  teacher_name TEXT,
  room_number TEXT,
  description TEXT,
  created_at TEXT
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS dugsiga_subjects (
  id TEXT PRIMARY KEY,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  class_name TEXT,
  teacher_name TEXT,
  created_at TEXT
);

-- Create exam scores table
CREATE TABLE IF NOT EXISTS dugsiga_exam_scores (
  id TEXT PRIMARY KEY,
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

-- Create attendance table (Updated to support dual-time: before/after break)
-- NOTE: Haddi aad horey u haysatay dugsiga_attendance, fadlan ku dhex ordi SQL Editor-kaaga:
-- ALTER TABLE dugsiga_attendance ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'before_break';
-- ALTER TABLE dugsiga_attendance DROP CONSTRAINT IF EXISTS dugsiga_attendance_pkey;
-- ALTER TABLE dugsiga_attendance ADD PRIMARY KEY (date, student_id, session_type);
CREATE TABLE IF NOT EXISTS dugsiga_attendance (
  date TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT,
  session_type TEXT DEFAULT 'before_break',
  PRIMARY KEY (date, student_id, session_type)
);

-- Create fees table
CREATE TABLE IF NOT EXISTS dugsiga_fees (
  id TEXT PRIMARY KEY,
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

-- Create settings table
CREATE TABLE IF NOT EXISTS dugsiga_settings (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- Disable Row Level Security (RLS) to allow direct secure API writes from the backend
ALTER TABLE dugsiga_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_exam_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE dugsiga_settings DISABLE ROW LEVEL SECURITY;
`;

// Helper to hash password (simple/fast custom hash for reliability)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Helper to send Verification Email
async function sendVerificationEmail(toEmail: string, code: string) {
  try {
    const mailOptions = {
      from: `"Dugsiga Pro" <${SMTP_FROM}>`,
      to: toEmail,
      subject: "Dugsiga Pro 2026 - Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Dugsiga Pro 2026</h2>
          <p>Assalamu Alaikum / Welcome to Dugsiga Pro School Management System.</p>
          <p>Saxeexkaaga ama Signup-kaaga si loo xaqiijiyo, fadlan isticmaal lambarkan xaqiijinta (Verification Code):</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e1b4b; background-color: #f3f4f6; padding: 10px 20px; border-radius: 6px; border: 1px dashed #4f46e5;">
              ${code}
            </span>
          </div>
          <p>Koodhkan wuxuu dhacayaa dhowaan. Fadlan ha la wadaagin cid kale.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">Dugsiga Pro 2026 - Online School Management Portal</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Verification email successfully sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
}

/**
 * Express adapter for @supabase/server withSupabase handlers.
 * Translates an Express Request/Response to Web API standard Request/Response.
 */
function expressWithSupabase(config: any, handler: any) {
  const webHandler = withSupabase(config, handler);
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
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
      
      // Inject API key and auth headers if present in our environment
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

// DB Status check endpoint
app.get("/api/db/status", async (req, res) => {
  // Check Supabase again
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
});

// TEST ENDPOINT FOR @supabase/server SDK
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

// 1. AUTHENTICATION: SIGN UP
app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || !email.includes("@")) {
    return res.status(400).json({ error: "Email sax ah iyo password fadlan geli." });
  }

  const passwordHash = simpleHash(password);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  if (!useLocalFallback) {
    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("dugsiga_users")
        .select("email")
        .eq("email", email)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingUser) {
        return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey." });
      }

      const { error } = await supabase.from("dugsiga_users").insert([
        {
          email,
          password: passwordHash,
          verified: false,
          verification_code: verificationCode
        }
      ]);

      if (error) throw error;
    } catch (e: any) {
      return handleSupabaseError(res, e, "Diiwaangelinta (Signup)");
    }
  } else {
    // Local DB implementation
    const db = loadLocalDB();
    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "Email-kan horey ayaa loo diiwaangeliyey." });
    }
    db.users.push({
      email,
      password_hash: passwordHash,
      verified: false,
      verification_code: verificationCode
    });
    saveLocalDB(db);
  }

  // Send verification code email via SMTP
  const emailSent = await sendVerificationEmail(email, verificationCode);

  res.json({
    success: true,
    message: "Diiwaangelintu way guuleysatay! Waxaa laguu soo diray koodhka xaqiijinta.",
    emailSent
  });
});

// 2. AUTHENTICATION: VERIFY CODE
app.post("/api/auth/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email iyo Koodh xaqiijin ah ayaa loo baahan yahay." });
  }

  if (!useLocalFallback) {
    try {
      const { data: user, error } = await supabase
        .from("dugsiga_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(400).json({ error: "Isticmaalaha lama helin." });
        }
        throw error;
      }

      if (!user) {
        return res.status(400).json({ error: "Isticmaalaha lama helin." });
      }

      if (user.verification_code !== code) {
        return res.status(400).json({ error: "Koodhka xaqiijintu waa qalad." });
      }

      const { error: updateError } = await supabase
        .from("dugsiga_users")
        .update({ verified: true })
        .eq("email", email);

      if (updateError) throw updateError;
    } catch (e: any) {
      return handleSupabaseError(res, e, "Xaqiijinta (Verification)");
    }
  } else {
    // Local DB fallback
    const db = loadLocalDB();
    const userIndex = db.users.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return res.status(400).json({ error: "Isticmaalaha lama helin." });
    }
    if (db.users[userIndex].verification_code !== code) {
      return res.status(400).json({ error: "Koodhka xaqiijintu waa qalad." });
    }
    db.users[userIndex].verified = true;
    saveLocalDB(db);
  }

  res.json({
    success: true,
    message: "Akoonkaaga si guul leh ayaa loo xaqiijiyey! Hadda waad geli kartaa."
  });
});

// 3. AUTHENTICATION: LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Fadlan geli email iyo password." });
  }

  const passwordHash = simpleHash(password);
  let userRecord: any = null;

  if (!useLocalFallback) {
    try {
      const { data: user, error } = await supabase
        .from("dugsiga_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
        }
        throw error;
      }
      if (!user) {
        return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
      }
      userRecord = user;
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo galidda (Login)");
    }
  } else {
    const db = loadLocalDB();
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
    }
    userRecord = {
      email: user.email,
      password: user.password_hash,
      verified: user.verified
    };
  }

  if (userRecord.password !== passwordHash) {
    return res.status(400).json({ error: "Email ama password ayaa qalad ah." });
  }

  if (!userRecord.verified) {
    return res.status(400).json({
      error: "Akoonkan weli lama xaqiijin.",
      unverified: true
    });
  }

  res.json({
    success: true,
    user: { email: userRecord.email }
  });
});

// 4. STUDENTS ENDPOINTS
app.get("/api/students", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase
        .from("dugsiga_students")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;

      // Map snake_case to camelCase
      const students = data.map(s => ({
        id: s.id,
        fullName: s.full_name,
        class: s.class,
        gender: s.gender,
        guardianPhone: s.guardian_phone,
        status: s.status,
        createdAt: s.created_at
      }));
      return res.json(students);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Ardayda (Fetch Students)");
    }
  } else {
    // Fallback / Default
    const db = loadLocalDB();
    res.json(db.students);
  }
});

app.post("/api/students", async (req, res) => {
  const student = req.body;
  if (!student.fullName || !student.class) {
    return res.status(400).json({ error: "Magaca iyo Class-ka waa qasab." });
  }

  if (!useLocalFallback) {
    try {
      // Check for duplicate student in the same class
      const { data: existing, error: checkError } = await supabase
        .from("dugsiga_students")
        .select("id")
        .ilike("full_name", student.fullName.trim())
        .eq("class", student.class)
        .limit(1);
      
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Ardaygan magacan leh horey ayaa loogu diiwaangeliyey fasalkan. (Duplicate Student)" });
      }

      const { error } = await supabase.from("dugsiga_students").insert([
        {
          id: student.id,
          full_name: student.fullName.trim(),
          class: student.class,
          gender: student.gender,
          guardian_phone: student.guardianPhone,
          status: student.status,
          created_at: student.createdAt
        }
      ]);
      if (error) throw error;
      return res.json(student);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Diiwaangelinta Ardayga (Add Student)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    const isDuplicate = db.students.some(s => 
      s.fullName.trim().toLowerCase() === student.fullName.trim().toLowerCase() && 
      s.class === student.class
    );
    if (isDuplicate) {
      return res.status(400).json({ error: "Ardaygan magacan leh horey ayaa loogu diiwaangeliyey fasalkan. (Duplicate Student)" });
    }

    db.students.push({
      ...student,
      fullName: student.fullName.trim()
    });
    saveLocalDB(db);
    res.json(student);
  }
});

app.put("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase
        .from("dugsiga_students")
        .update({
          full_name: updates.fullName,
          class: updates.class,
          gender: updates.gender,
          guardian_phone: updates.guardianPhone,
          status: updates.status
        })
        .eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Tafatirka Ardayga (Update Student)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    const idx = db.students.findIndex(s => s.id === id);
    if (idx > -1) {
      db.students[idx] = { ...db.students[idx], ...updates };
      saveLocalDB(db);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Student not found" });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const { id } = req.params;

  if (!useLocalFallback) {
    try {
      const { error: err1 } = await supabase.from("dugsiga_students").delete().eq("id", id);
      if (err1) throw err1;
      const { error: err2 } = await supabase.from("dugsiga_fees").delete().eq("student_id", id);
      if (err2) throw err2;
      const { error: err3 } = await supabase.from("dugsiga_attendance").delete().eq("student_id", id);
      if (err3) throw err3;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Tirtirista Ardayga (Delete Student)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    db.students = db.students.filter(s => s.id !== id);
    db.fees = db.fees.filter(f => f.studentId !== id);
    db.attendance = db.attendance.filter(a => a.studentId !== id);
    saveLocalDB(db);
    res.json({ success: true });
  }
});

// 5. ATTENDANCE ENDPOINTS
app.get("/api/attendance", async (req, res) => {
  const { date, session_type } = req.query;

  if (!useLocalFallback) {
    try {
      let query = supabase.from("dugsiga_attendance").select("*");
      if (date) {
        query = query.eq("date", date as string);
      }
      if (session_type) {
        query = query.eq("session_type", session_type as string);
      }
      let { data, error } = await query;
      
      if (error) {
        // If undefined_column (42703) or session_type error, retry selecting only original columns
        if (error.code === '42703' || (error.message && error.message.toLowerCase().includes('session_type'))) {
          let retryQuery = supabase.from("dugsiga_attendance").select("date, student_id, status, timestamp");
          if (date) {
            retryQuery = retryQuery.eq("date", date as string);
          }
          const { data: retryData, error: retryError } = await retryQuery;
          if (retryError) throw retryError;
          data = retryData;
        } else {
          throw error;
        }
      }

      const formatted = (data || []).map(a => ({
        date: a.date,
        studentId: a.student_id,
        status: a.status,
        timestamp: a.timestamp,
        sessionType: a.session_type || 'before_break'
      }));
      return res.json(formatted);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Xaadirinta (Fetch Attendance)");
    }
  } else {
    const db = loadLocalDB();
    let list = db.attendance;
    if (date) {
      list = list.filter(a => a.date === date);
    }
    if (session_type) {
      list = list.filter(a => (a.sessionType || 'before_break') === session_type);
    }
    res.json(list);
  }
});

app.post("/api/attendance", async (req, res) => {
  const { date, session_type, records } = req.body; // records: Array<{studentId, status, timestamp}>
  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: "Date and records array required" });
  }
  const sType = session_type || 'before_break';

  if (!useLocalFallback) {
    try {
      // 1. Delete existing records for that date and session (try with session_type, fallback if column missing)
      try {
        const { error: delError } = await supabase
          .from("dugsiga_attendance")
          .delete()
          .eq("date", date)
          .eq("session_type", sType);
        
        if (delError) {
          if (delError.code === '42703' || (delError.message && delError.message.toLowerCase().includes('session_type'))) {
            const { error: delError2 } = await supabase
              .from("dugsiga_attendance")
              .delete()
              .eq("date", date);
            if (delError2) throw delError2;
          } else {
            throw delError;
          }
        }
      } catch (delErr: any) {
        const { error: delError2 } = await supabase
          .from("dugsiga_attendance")
          .delete()
          .eq("date", date);
        if (delError2) throw delError2;
      }

      // 2. Insert records (try with session_type, fallback if column missing)
      const dbRecords = records.map(r => ({
        date: date,
        student_id: r.studentId,
        status: r.status,
        timestamp: r.timestamp
      }));

      if (dbRecords.length > 0) {
        try {
          const recordsWithSession = dbRecords.map(r => ({
            ...r,
            session_type: sType
          }));
          const { error } = await supabase.from("dugsiga_attendance").insert(recordsWithSession);
          if (error) {
            if (error.code === '42703' || (error.message && error.message.toLowerCase().includes('session_type'))) {
              const { error: insertError } = await supabase.from("dugsiga_attendance").insert(dbRecords);
              if (insertError) throw insertError;
            } else {
              throw error;
            }
          }
        } catch (insertErr: any) {
          const { error: insertError } = await supabase.from("dugsiga_attendance").insert(dbRecords);
          if (insertError) throw insertError;
        }
      }
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Kaydinta Xaadirinta (Save Attendance)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    // Filter out existing records for this date and session
    db.attendance = db.attendance.filter(a => !(a.date === date && (a.sessionType || 'before_break') === sType));
    // Add new records
    records.forEach(r => {
      db.attendance.push({
        date,
        studentId: r.studentId,
        status: r.status,
        timestamp: r.timestamp,
        sessionType: sType
      });
    });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

// 6. FEES / FINANCIAL INVOICES ENDPOINTS
app.get("/api/fees", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_fees").select("*");
      if (error) throw error;

      const formatted = data.map(f => ({
        id: f.id,
        studentId: f.student_id,
        month: f.month,
        year: f.year,
        amount: parseFloat(f.amount),
        paidAmount: parseFloat(f.paid_amount),
        status: f.status,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        history: f.history || []
      }));
      return res.json(formatted);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Biilasha (Fetch Fees)");
    }
  } else {
    const db = loadLocalDB();
    res.json(db.fees);
  }
});

app.post("/api/fees", async (req, res) => {
  const fee = req.body;
  if (!fee.studentId || !fee.month || !fee.year) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!useLocalFallback) {
    try {
      // Check for duplicate fee
      const { data: existing, error: checkError } = await supabase
        .from("dugsiga_fees")
        .select("id")
        .eq("student_id", fee.studentId)
        .eq("month", fee.month)
        .eq("year", fee.year)
        .limit(1);
      
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Biilka bishan ee ardaygan horey ayaa loo abuuray. (Duplicate Fee Record)" });
      }

      const { error } = await supabase.from("dugsiga_fees").insert([
        {
          id: fee.id,
          student_id: fee.studentId,
          month: fee.month,
          year: fee.year,
          amount: fee.amount,
          paid_amount: fee.paidAmount,
          status: fee.status,
          created_at: fee.createdAt,
          updated_at: fee.updatedAt,
          history: fee.history
        }
      ]);
      if (error) throw error;
      return res.json(fee);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Abuurista Biilka (Create Fee)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    const isDuplicate = db.fees.some(f => 
      f.studentId === fee.studentId && 
      f.month === fee.month && 
      f.year === fee.year
    );
    if (isDuplicate) {
      return res.status(400).json({ error: "Biilka bishan ee ardaygan horey ayaa loo abuuray. (Duplicate Fee Record)" });
    }

    db.fees.push(fee);
    saveLocalDB(db);
    res.json(fee);
  }
});

app.put("/api/fees/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase
        .from("dugsiga_fees")
        .update({
          month: updates.month,
          year: updates.year,
          amount: updates.amount,
          paid_amount: updates.paidAmount,
          status: updates.status,
          updated_at: updates.updatedAt,
          history: updates.history
        })
        .eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Cusbooneysiinta Biilka (Update Fee)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    const idx = db.fees.findIndex(f => f.id === id);
    if (idx > -1) {
      db.fees[idx] = { ...db.fees[idx], ...updates };
      saveLocalDB(db);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Fee not found" });
  }
});

app.delete("/api/fees/:id", async (req, res) => {
  const { id } = req.params;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_fees").delete().eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Tirtirista Biilka (Delete Fee)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    db.fees = db.fees.filter(f => f.id !== id);
    saveLocalDB(db);
    res.json({ success: true });
  }
});

// 6.5. CLASSES, SUBJECTS & EXAMS ENDPOINTS

// --- CLASSES ---
app.get("/api/classes", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_classes").select("*");
      if (error) throw error;
      const formatted = data.map(c => ({
        id: c.id,
        className: c.class_name,
        teacherName: c.teacher_name,
        roomNumber: c.room_number,
        description: c.description,
        createdAt: c.created_at
      }));
      return res.json(formatted);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Fasallada (Fetch Classes)");
    }
  } else {
    const db = loadLocalDB();
    res.json(db.classes || []);
  }
});

app.post("/api/classes", async (req, res) => {
  const { id, className, teacherName, roomNumber, description, createdAt } = req.body;
  if (!className) return res.status(400).json({ error: "Class name is required" });

  if (!useLocalFallback) {
    try {
      // Check if class with name already exists
      const { data: existing, error: checkError } = await supabase
        .from("dugsiga_classes")
        .select("id")
        .ilike("class_name", className.trim())
        .limit(1);
      
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Fasalkan magacan leh horey ayaa loo diiwaangeliyey. (Duplicate Class)" });
      }

      const { error } = await supabase.from("dugsiga_classes").insert([{
        id: id || 'cls-' + Math.random().toString(36).substr(2, 9),
        class_name: className.trim(),
        teacher_name: teacherName || "",
        room_number: roomNumber || "",
        description: description || "",
        created_at: createdAt || new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Kaydinta Fasalka (Save Class)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.classes) db.classes = [];
    
    const isDuplicate = db.classes.some(c => 
      c.className.trim().toLowerCase() === className.trim().toLowerCase()
    );
    if (isDuplicate) {
      return res.status(400).json({ error: "Fasalkan magacan leh horey ayaa loo diiwaangeliyey. (Duplicate Class)" });
    }

    db.classes.push({
      id: id || 'cls-' + Math.random().toString(36).substr(2, 9),
      className: className.trim(),
      teacherName: teacherName || "",
      roomNumber: roomNumber || "",
      description: description || "",
      createdAt: createdAt || new Date().toISOString().split('T')[0]
    });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.put("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  const { className, teacherName, roomNumber, description } = req.body;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_classes").update({
        class_name: className,
        teacher_name: teacherName,
        room_number: roomNumber,
        description: description
      }).eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Cusbooneysiinta Fasalka (Update Class)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.classes) db.classes = [];
    const idx = db.classes.findIndex(c => c.id === id);
    if (idx > -1) {
      db.classes[idx] = { ...db.classes[idx], className, teacherName, roomNumber, description };
      saveLocalDB(db);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Class not found" });
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  const { id } = req.params;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_classes").delete().eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Tirtirista Fasalka (Delete Class)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.classes) db.classes = [];
    db.classes = db.classes.filter(c => c.id !== id);
    saveLocalDB(db);
    res.json({ success: true });
  }
});


// --- SUBJECTS ---
app.get("/api/subjects", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_subjects").select("*");
      if (error) throw error;
      const formatted = data.map(s => ({
        id: s.id,
        subjectName: s.subject_name,
        subjectCode: s.subject_code,
        className: s.class_name,
        teacherName: s.teacher_name,
        createdAt: s.created_at
      }));
      return res.json(formatted);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Maddooyinka (Fetch Subjects)");
    }
  } else {
    const db = loadLocalDB();
    res.json(db.subjects || []);
  }
});

app.post("/api/subjects", async (req, res) => {
  const { id, subjectName, subjectCode, className, teacherName, createdAt } = req.body;
  if (!subjectName) return res.status(400).json({ error: "Subject name is required" });

  if (!useLocalFallback) {
    try {
      // Check for duplicate subject in the same class
      const { data: existing, error: checkError } = await supabase
        .from("dugsiga_subjects")
        .select("id")
        .ilike("subject_name", subjectName.trim())
        .eq("class_name", className || "")
        .limit(1);
      
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Maaddadan magacan leh horey ayaa loogu daray fasalkan. (Duplicate Subject)" });
      }

      const { error } = await supabase.from("dugsiga_subjects").insert([{
        id: id || 'sub-' + Math.random().toString(36).substr(2, 9),
        subject_name: subjectName.trim(),
        subject_code: subjectCode || "",
        class_name: className || "",
        teacher_name: teacherName || "",
        created_at: createdAt || new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Kaydinta Maaddada (Save Subject)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.subjects) db.subjects = [];

    const isDuplicate = db.subjects.some(s => 
      s.subjectName.trim().toLowerCase() === subjectName.trim().toLowerCase() && 
      s.className === (className || "")
    );
    if (isDuplicate) {
      return res.status(400).json({ error: "Maaddadan magacan leh horey ayaa loogu daray fasalkan. (Duplicate Subject)" });
    }

    db.subjects.push({
      id: id || 'sub-' + Math.random().toString(36).substr(2, 9),
      subjectName: subjectName.trim(),
      subjectCode: subjectCode || "",
      className: className || "",
      teacherName: teacherName || "",
      createdAt: createdAt || new Date().toISOString().split('T')[0]
    });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.put("/api/subjects/:id", async (req, res) => {
  const { id } = req.params;
  const { subjectName, subjectCode, className, teacherName } = req.body;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_subjects").update({
        subject_name: subjectName,
        subject_code: subjectCode,
        class_name: className,
        teacher_name: teacherName
      }).eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Cusbooneysiinta Maaddada (Update Subject)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.subjects) db.subjects = [];
    const idx = db.subjects.findIndex(s => s.id === id);
    if (idx > -1) {
      db.subjects[idx] = { ...db.subjects[idx], subjectName, subjectCode, className, teacherName };
      saveLocalDB(db);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Subject not found" });
  }
});

app.delete("/api/subjects/:id", async (req, res) => {
  const { id } = req.params;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_subjects").delete().eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Tirtirista Maaddada (Delete Subject)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.subjects) db.subjects = [];
    db.subjects = db.subjects.filter(s => s.id !== id);
    saveLocalDB(db);
    res.json({ success: true });
  }
});


// --- EXAM SCORES ---
app.get("/api/exams", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase.from("dugsiga_exam_scores").select("*");
      if (error) throw error;
      const formatted = data.map(e => ({
        id: e.id,
        studentId: e.student_id,
        studentName: e.student_name,
        className: e.class_name,
        subjectName: e.subject_name,
        examName: e.exam_name,
        term: e.term,
        maxMarks: Number(e.max_marks || 100),
        marksObtained: Number(e.marks_obtained),
        grade: e.grade,
        examDate: e.exam_date,
        createdAt: e.created_at
      }));
      return res.json(formatted);
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Imtixaanada (Fetch Exams)");
    }
  } else {
    const db = loadLocalDB();
    res.json(db.examScores || []);
  }
});

app.post("/api/exams", async (req, res) => {
  const { id, studentId, studentName, className, subjectName, examName, term, maxMarks, marksObtained, grade, examDate, createdAt } = req.body;
  if (!studentId || !className || !subjectName || !examName || marksObtained === undefined) {
    return res.status(400).json({ error: "Missing required fields for exam score recording" });
  }

  if (!useLocalFallback) {
    try {
      // Check for duplicate exam score
      const { data: existing, error: checkError } = await supabase
        .from("dugsiga_exam_scores")
        .select("id")
        .eq("student_id", studentId)
        .eq("subject_name", subjectName)
        .eq("exam_name", examName)
        .limit(1);
      
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Natiijadan imtixaanka ee ardaygan horey ayaa loo duubay. (Duplicate Exam Score)" });
      }

      const { error } = await supabase.from("dugsiga_exam_scores").insert([{
        id: id || 'exm-' + Math.random().toString(36).substr(2, 9),
        student_id: studentId,
        student_name: studentName || "",
        class_name: className,
        subject_name: subjectName,
        exam_name: examName,
        term: term || "Term 1",
        max_marks: maxMarks || 100,
        marks_obtained: marksObtained,
        grade: grade || "",
        exam_date: examDate || new Date().toISOString().split('T')[0],
        created_at: createdAt || new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Kaydinta Natiijada Imtixaanka (Save Exam Score)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.examScores) db.examScores = [];

    const isDuplicate = db.examScores.some(e => 
      e.studentId === studentId && 
      e.subjectName === subjectName && 
      e.examName === examName
    );
    if (isDuplicate) {
      return res.status(400).json({ error: "Natiijadan imtixaanka ee ardaygan horey ayaa loo duubay. (Duplicate Exam Score)" });
    }

    db.examScores.push({
      id: id || 'exm-' + Math.random().toString(36).substr(2, 9),
      studentId,
      studentName: studentName || "",
      className,
      subjectName,
      examName,
      term: term || "Term 1",
      maxMarks: maxMarks || 100,
      marksObtained,
      grade: grade || "",
      examDate: examDate || new Date().toISOString().split('T')[0],
      createdAt: createdAt || new Date().toISOString().split('T')[0]
    });
    saveLocalDB(db);
    res.json({ success: true });
  }
});

app.put("/api/exams/:id", async (req, res) => {
  const { id } = req.params;
  const { studentId, studentName, className, subjectName, examName, term, maxMarks, marksObtained, grade, examDate } = req.body;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_exam_scores").update({
        student_id: studentId,
        student_name: studentName,
        class_name: className,
        subject_name: subjectName,
        exam_name: examName,
        term: term,
        max_marks: maxMarks,
        marks_obtained: marksObtained,
        grade: grade,
        exam_date: examDate
      }).eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Cusbooneysiinta Natiijada Imtixaanka (Update Exam Score)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.examScores) db.examScores = [];
    const idx = db.examScores.findIndex(e => e.id === id);
    if (idx > -1) {
      db.examScores[idx] = { ...db.examScores[idx], studentId, studentName, className, subjectName, examName, term, maxMarks, marksObtained, grade, examDate };
      saveLocalDB(db);
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Exam score record not found" });
  }
});

app.delete("/api/exams/:id", async (req, res) => {
  const { id } = req.params;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_exam_scores").delete().eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Tirtirista Natiijada (Delete Exam Score)");
    }
  } else {
    const db = loadLocalDB();
    if (!db.examScores) db.examScores = [];
    db.examScores = db.examScores.filter(e => e.id !== id);
    saveLocalDB(db);
    res.json({ success: true });
  }
});

// 7. SYSTEM SETTINGS ENDPOINTS
app.get("/api/settings", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { data, error } = await supabase
        .from("dugsiga_settings")
        .select("*")
        .eq("key", "main_settings")
        .single();
      
      // If no row exists yet, we return the default setting structure but don't fail
      if (error && error.code !== "PGRST116") throw error; 
      if (data) {
        return res.json(data.value);
      } else {
        // Return default settings if none saved yet in Supabase
        return res.json(defaultSettings);
      }
    } catch (e: any) {
      return handleSupabaseError(res, e, "Soo qaadista Qaabeynta (Fetch Settings)");
    }
  } else {
    const db = loadLocalDB();
    res.json(db.settings);
  }
});

app.put("/api/settings", async (req, res) => {
  const settings = req.body;

  if (!useLocalFallback) {
    try {
      const { error } = await supabase.from("dugsiga_settings").upsert({
        key: "main_settings",
        value: settings
      });
      if (error) throw error;
      return res.json({ success: true });
    } catch (e: any) {
      return handleSupabaseError(res, e, "Kaydinta Qaabeynta (Update Settings)");
    }
  } else {
    // Fallback
    const db = loadLocalDB();
    db.settings = { ...db.settings, ...settings };
    saveLocalDB(db);
    res.json({ success: true });
  }
});

// 8. FACTORY RESET
app.post("/api/reset", async (req, res) => {
  if (!useLocalFallback) {
    try {
      const { error: err1 } = await supabase.from("dugsiga_students").delete().neq("id", "0");
      if (err1) throw err1;
      const { error: err2 } = await supabase.from("dugsiga_fees").delete().neq("id", "0");
      if (err2) throw err2;
      const { error: err3 } = await supabase.from("dugsiga_attendance").delete().neq("status", "NOT_A_STATUS");
      if (err3) throw err3;
      const { error: err4 } = await supabase.from("dugsiga_settings").delete().eq("key", "main_settings");
      if (err4) throw err4;
    } catch (e: any) {
      return handleSupabaseError(res, e, "Factory Reset");
    }
  }

  // Fallback resets local too
  const initial: LocalDB = {
    users: [],
    students: [],
    attendance: [],
    fees: [],
    classes: [],
    subjects: [],
    examScores: [],
    settings: defaultSettings
  };
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
  res.json({ success: true });
});

// Vite Middleware & Static Serves
if (process.env.DISABLE_HMR !== "true") {
  process.env.DISABLE_HMR = "true"; // ensure consistent environment setting
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
