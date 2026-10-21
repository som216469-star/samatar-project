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

console.log("Database source-of-truth contract checks: PASS");
