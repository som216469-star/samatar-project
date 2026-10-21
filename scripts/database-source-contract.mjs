import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Database source contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Database source contract failed: ${label}`);
  }
}

function assertNotContains(content, needle, label) {
  if (content.includes(needle)) {
    throw new Error(`Database source contract failed: ${label}`);
  }
}

const server = read("server.ts");
const smoke = read("scripts/server-smoke.mjs");
const modern = read("server/modernRoutes.ts");
const finance = read("server/financeRoutes.ts");

assertContains(server, 'const supabaseUrl = parseSupabaseUrl(process.env.SUPABASE_URL);', "Supabase URL must be explicitly configured");
assertNotContains(server, "https://mdvfcqujqjnvfpzowayo.supabase.co", "no hard-coded Supabase project fallback");
assertNotContains(server, "syncLocalToSupabase", "no automatic local-to-cloud merge");
assertContains(server, "const safeWithoutDatabase =", "explicit database-independent endpoint allowlist");
assertContains(server, '"/db/status"', "database status endpoint remains accessible");
assertContains(server, '"/user/profile"', "signed-in profile endpoint remains available");
assertContains(server, 'req.path === "/auth/logout"', "logout remains available while database is unavailable");
assertContains(server, 'process.env.NODE_ENV === "production" &&\n    useLocalFallback &&\n    !safeWithoutDatabase', "production requests fail closed if Supabase is unavailable");
assertContains(server, 'code: "DATABASE_UNAVAILABLE"', "stable database unavailable error code");
assertContains(server, 'process.env.QUANTORA_SKIP_DOTENV !== "1"', "smoke test can isolate itself from developer .env files");

assertContains(smoke, "studentsWhenDatabaseUnavailable", "runtime checks the production unavailable state");
assertContains(smoke, "should fail closed when production database is unavailable", "runtime asserts data API returns 503");
assertContains(smoke, "should remain available to clear the session", "runtime asserts logout is available");
assertContains(smoke, "QUANTORA_SKIP_DOTENV: '1'", "runtime test does not load local credentials");

assertContains(server, "if (customSupabaseActive) return;", "cloud-active cache is not persisted to the service filesystem");
assertContains(server, 'if (customSupabaseActive) {\n    if (inMemoryDB) return ensureArrays(inMemoryDB);', "cloud mode does not read stale database.json or /tmp JSON cache");
assertContains(server, 'const { error: readError }', "database health checks use a read-only probe");
assertNotContains(server, 'school_id: "__health_check__"', "health checks do not write fake tenant rows");

assertNotContains(modern, "catch (e: any) {}", "cloud route failures are not silently swallowed");
assertContains(modern, 'supabase.from("dugsiga_students").select("id,status").eq("school_id", schoolId)', "dashboard analytics reads tenant-scoped cloud data");
assertContains(modern, "let cloudSlotsRead = false;", "empty timetable cloud results are tracked as authoritative");
assertContains(modern, "Compare-and-set prevents two concurrent requests from borrowing the last copy.", "library loan stock updates protect the last copy");
assertContains(modern, '.eq("school_id", schoolId)', "modern route data access scopes rows to the authenticated school");

assertContains(finance, "const refreshFinanceCollectionsFromSupabase =", "finance reads refresh from the cloud source of truth");
assertContains(finance, "rows: (data || []).map(definition.map)", "empty finance cloud results replace stale cache rows");
assertContains(finance, "const syncFinanceTransaction =", "related finance writes use the database transaction RPC");

console.log("Database source-of-truth contract checks: PASS");
