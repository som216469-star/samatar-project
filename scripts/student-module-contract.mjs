import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Students contract failed: ${label}`);
  }
}

function assertNotContains(content, needle, label) {
  if (content.includes(needle)) {
    throw new Error(`Students contract failed: ${label}`);
  }
}

const server = read("server.ts");
const studentsPage = read("src/features/students/StudentsPage.tsx");
const form = read("src/features/students/components/StudentFormModal.tsx");
const addView = read("src/features/students/components/StudentAddView.tsx");
const importView = read("src/features/students/components/StudentImportView.tsx");
const profile = read("src/features/students/components/StudentProfileModal.tsx");
const canonicalSql = read("DUGSI_PRO_2026_ALL_TABLES.sql");
const migration = read("supabase/migrations/20261002_students_10_10_audit_and_integrity.sql");

// Server-side tenant and permission contracts.
assertContains(server, 'function getSchoolId(req: express.Request): string {', "session-bound school resolver");
assertContains(server, 'return authUser?.schoolId?.trim() || "";', "no client-controlled school fallback");
assertContains(server, 'if (pathName === "/students/bulk" || pathName === "/students/import") return "students.manage";', "bulk/import permission gate");
assertContains(server, 'if (/^\\/students\\/[^/]+\\/audit$/.test(pathName)) return "students.manage";', "audit permission gate");
assertContains(server, 'app.post("/api/students/import"', "batch import endpoint");
assertContains(server, 'school_id", schoolId', "tenant-scoped Supabase queries");
assertContains(server, 'getStudentDependencyIds(studentIds, schoolId)', "tenant-scoped dependency checks");
assertContains(server, 'recordStudentAudit(', "student audit trail");
assertContains(server, 'handleStudentSupabaseError(', "safe student DB error handling");
assertContains(server, 'process.env.NODE_ENV === "production"', "production split-brain protection");
assertContains(server, 'routeKey === "import"', "student import rate limiting");
assertContains(server, 'routeKey === "bulk"', "student bulk rate limiting");
assertContains(server, 'canViewSensitiveStudentData(authUser)', "student sensitive data policy");
assertContains(server, 'studentAudit?: Array<', "local student audit storage");
assertContains(server, 'function recordLocalStudentAudit(', "local student audit writer");
assertContains(server, 'await studentClassExists(schoolId, student.class, student.section || "")', "local add class integrity");
assertContains(server, 'await assertStudentClassCapacity(', "local add/update/bulk capacity guardrail");
assertContains(server, 'recordLocalStudentAudit(db, authUser, schoolId, id, "deleted"', "local delete audit trail");
assertContains(server, 'const auditRows = (db.studentAudit || [])', "local audit endpoint");


// Student input and UX contracts.
assertContains(studentsPage, "getStudentPermissions(userRole)", "frontend student RBAC");
assertContains(studentsPage, "onImportStudents", "batched import integration");
assertContains(studentsPage, "formData.emergencyContact", "emergency contact state");
assertContains(form, "emergencyContact: string;", "typed emergency contact");
assertContains(form, "emergencyContact", "emergency contact form binding");
assertNotContains(studentsPage, "Math.random()", "student ID randomness regression");
assertContains(addView, "crypto.randomUUID", "secure student ID generation");
assertContains(addView, "duplicateCheckSequence", "stale duplicate-check protection");
assertContains(addView, "sameEmergencyContact", "emergency duplicate warning");
assertContains(addView, "isValidDateOnly", "strict client DOB validation");
assertContains(studentsPage, "dugsi_student_view", "student view preference persistence");
assertContains(studentsPage, "getLocalDateString", "local-date handling");
assertContains(importView, "Emergency Contact", "import template emergency contact");
assertContains(importView, "dateOfBirth", "import DOB coverage");
assertContains(profile, "Student Activity", "profile activity history");
assertContains(profile, "canViewFinance", "finance visibility guard");

// Canonical database contracts.
assertContains(canonicalSql, "CREATE TABLE IF NOT EXISTS dugsiga_student_audit", "canonical audit table");
assertContains(canonicalSql, "ENABLE ROW LEVEL SECURITY", "canonical RLS");
assertContains(canonicalSql, "dugsiga_student_audit", "audit table in canonical security scope");
assertContains(canonicalSql, "emergency_contact TEXT", "canonical emergency contact field");
assertContains(canonicalSql, "uq_dugsiga_students_school_class_section_roll", "scoped roll uniqueness");
assertContains(canonicalSql, "uq_dugsiga_students_school_national_id", "scoped national ID uniqueness");

// Migration contracts.
assertContains(migration, "dugsiga_student_audit_immutable", "append-only audit protection");
assertContains(migration, "trg_dugsiga_students_class_assignment", "class assignment guardrail");
assertContains(migration, "trg_dugsiga_students_class_capacity", "class capacity guardrail");
assertContains(migration, "dugsiga_students_emergency_contact_valid", "emergency contact constraint");

console.log("Students module contract checks: PASS");
