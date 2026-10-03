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
    throw new Error(`Attendance contract failed: ${label}`);
  }
}

function assertNotContains(content, needle, label) {
  if (content.includes(needle)) {
    throw new Error(`Attendance contract failed: ${label}`);
  }
}

const server = read("server.ts");
const hook = read("src/hooks/useInstitutionalData.ts");
const ui = read("src/features/attendance/AttendanceModule.tsx");

assertContains(server, 'const recordsByStudent = new Map<string, {', "duplicate student guard");
assertContains(server, 'onConflict: "school_id,date,student_id,session_type"', "idempotent Supabase attendance upsert");
assertContains(server, 'const incomingIds = new Set(normalizedRecords.map((record) => record.studentId));', "scoped local save ids");
assertContains(server, 'incomingIds.has(String(row.studentId))', "local save preserves other students/classes");
assertContains(server, 'Attendance waxaa loo diiwaangelin karaa ardayda Active ah oo keliya.', "active-only attendance guard");
assertContains(server, 'assigned.includes(String(student.class || "").trim())', "teacher class authorization");

assertContains(hook, "selectedAttendanceClass === 'All'", "selected class-aware save");
assertContains(hook, "const targetStudents =", "target roster derivation");
assertContains(hook, "const attendanceLookup = new Map<string, AttendanceRecord>(", "constant-time current session lookup");
assertContains(hook, "const fetchAttendanceHistory = useCallback(async () =>", "cumulative history fetch");
assertContains(hook, "const res = await apiFetch('/api/attendance');", "history endpoint uses unfiltered attendance");
assertNotContains(hook, "const recordsToSave = activeStudents.map", "regression: save all active students regardless of selected class");

assertContains(ui, "function getLocalDateString(", "local date helper");
assertContains(ui, "const currentSessionAttendance = useMemo(", "current session lookup map");
assertContains(ui, "const attendanceByStudent = useMemo(", "history lookup map");
assertContains(ui, "currentSessionAttendance.get(student.id)", "fast sheet lookup");
assertContains(ui, "attendanceByStudent.get(", "fast history lookup");
assertContains(ui, "max={getLocalDateString()}", "no future attendance date");

console.log("Attendance module contract checks: PASS");
