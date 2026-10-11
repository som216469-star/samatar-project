import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Database source-of-truth contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}
function assertContains(content, needle, label) {
  if (!content.includes(needle)) throw new Error(`Database source-of-truth contract failed: ${label}`);
}
function assertNotContains(content, needle, label) {
  if (content.includes(needle)) throw new Error(`Database source-of-truth contract failed: ${label}`);
}

const server = read("server.ts");
const finance = read("server/financeRoutes.ts");
const teacherAuth = read("server/teacherAuthRoutes.ts");
const rpc = read("supabase/migrations/20261011_phase1_tenant_incremental_persistence.sql");
const migration = read("scripts/migrate-database-json-to-supabase.mjs");

assertContains(server, 'process.env.NODE_ENV !== "production" && process.env.LOCAL_JSON_FALLBACK === "true"', "local JSON fallback requires explicit development-only flag");
assertContains(server, "if (!localJsonFallbackEnabled)", "JSON reads and writes are gated");
assertContains(server, 'supabase.rpc("dugsiga_apply_tenant_changes"', "request changes use incremental tenant RPC persistence");
assertContains(server, '.eq("school_id", schoolId)', "Supabase reads are school-scoped");
assertNotContains(server, "syncLocalToSupabase", "legacy local-to-cloud startup sync is removed");

const loadStart = server.indexOf("function loadLocalDB()");
const loadEnd = server.indexOf("function recordLocalStudentAudit(", loadStart);
if (loadStart < 0 || loadEnd < 0) throw new Error("Database source-of-truth contract failed: local loader boundaries not found");
const loader = server.slice(loadStart, loadEnd);
assertContains(loader, "if (!localJsonFallbackEnabled)", "local loader checks the explicit flag");
assertContains(loader, "fs.readFileSync(dbPath", "JSON load is confined to the opt-in local loader");

const saveStart = server.indexOf("function saveLocalDB(");
const saveEnd = server.indexOf("function getSchoolId(", saveStart);
if (saveStart < 0 || saveEnd < 0) throw new Error("Database source-of-truth contract failed: local saver boundaries not found");
const saver = server.slice(saveStart, saveEnd);
assertContains(saver, "scheduleTenantDBSave(data)", "production saves use row-diff persistence");
assertContains(saver, "if (!localJsonFallbackEnabled)", "full-file writes are behind local-only mode");
assertContains(saver, "fs.writeFileSync(PRIMARY_DB_PATH", "local-only JSON saving remains available");

assertContains(finance, 'rpc("dugsiga_record_payment"', "payment and invoice balance use atomic SQL transaction");
assertContains(finance, 'rpc("dugsiga_mark_payroll_paid"', "payroll paid and linked expense use atomic SQL transaction");
assertContains(teacherAuth, 'rpc("dugsiga_activate_teacher_invitation"', "teacher activation no longer requires local/cloud dual writes");
assertContains(rpc, "FOR UPDATE", "financial transactions lock the affected row");
assertContains(rpc, "dugsiga_apply_tenant_changes", "incremental persistence RPC exists");
assertContains(rpc, "dugsiga_record_payment", "atomic payment RPC exists");
assertContains(rpc, "dugsiga_mark_payroll_paid", "atomic payroll RPC exists");
assertContains(rpc, "dugsiga_activate_teacher_invitation", "atomic teacher activation RPC exists");
assertContains(rpc, "REVOKE ALL ON FUNCTION", "privileged RPCs revoke public execute rights");
assertContains(rpc, "GRANT EXECUTE ON FUNCTION", "privileged RPCs grant service_role only");

assertContains(migration, 'process.argv.includes("--apply")', "migration defaults to dry-run");
assertContains(migration, 'supabase.from(definition.table).insert([item.row])', "migration only inserts missing rows; it doesn't upsert/overwrite");
assertContains(migration, '.eq("school_id", schoolId)', "migration inspection is tenant-scoped");
assertNotContains(migration, "unlinkSync", "migration never deletes the source JSON file");

console.log("Database source-of-truth contract checks: PASS");
