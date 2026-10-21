import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Auth security contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Auth security contract failed: ${label}`);
  }
}

function assertNotContains(content, needle, label) {
  if (content.includes(needle)) {
    throw new Error(`Auth security contract failed: ${label}`);
  }
}

const server = read("server.ts");
const loginStart = server.indexOf('app.post("/api/auth/login"');
if (loginStart < 0) throw new Error("Auth security contract failed: login route not found");

const cloudStart = server.indexOf("// 1. Supabase is the only authentication source when cloud mode is active.", loginStart);
const localFallbackStart = server.indexOf("// 2. Secure local fallback with transparent legacy-hash upgrade.", cloudStart);
if (cloudStart < 0 || localFallbackStart < 0) {
  throw new Error("Auth security contract failed: cloud/local login boundary not found");
}
const cloudLogin = server.slice(cloudStart, localFallbackStart);

assertContains(cloudLogin, '.eq("email", cleanEmail)', "cloud login uses exact normalized email lookup");
assertNotContains(cloudLogin, '.ilike("email", cleanEmail)', "cloud login does not interpret email as a wildcard pattern");
assertNotContains(cloudLogin, "localCheck.valid", "cached local password cannot authenticate a cloud account");
assertContains(cloudLogin, 'else if (!user)', "missing cloud account is rejected instead of falling through to stale cache");
assertContains(cloudLogin, 'if (!cloudCheck.valid)', "cloud password hash must validate");
assertContains(cloudLogin, 'code: "DATABASE_UNAVAILABLE"', "database authentication failures are explicit");
assertContains(cloudLogin, 'process.env.NODE_ENV === "production" || !networkFailure', "production does not fall back to local credentials during a database outage");

const signupStart = server.indexOf('app.post("/api/auth/signup"');
const signupEnd = server.indexOf('app.post("/api/auth/verify"', signupStart);
if (signupStart < 0 || signupEnd < 0) throw new Error("Auth security contract failed: signup boundary not found");
const signup = server.slice(signupStart, signupEnd);
assertContains(signup, "Signup rejected because the authoritative database write failed.", "signup fails closed when cloud persistence fails");
assertContains(signup, 'code: "DATABASE_UNAVAILABLE"', "signup reports cloud persistence failure");
assertContains(signup, 'if (insertError.code === "23505")', "duplicate cloud accounts remain rejected");

const teacherAuth = read("server/teacherAuthRoutes.ts");
assertContains(teacherAuth, 'if (!getUseLocalFallback() && supabase)', "teacher invitation handlers distinguish cloud authority from local fallback");
assertContains(teacherAuth, 'Cloud teacher activation failed:', "teacher activation reports cloud persistence failures");
assertContains(teacherAuth, "Restore the invitation so the teacher can safely retry", "failed teacher account persistence attempts to restore the invitation");
assertContains(teacherAuth, '.eq("school_id", authUser.schoolId)', "teacher admin actions are tenant-scoped");
assertNotContains(teacherAuth, "catch (e) {}", "teacher activation and administration do not silently swallow cloud failures");
assertContains(teacherAuth, "Do not persist cloud credentials into database.json.", "cloud teacher passwords are not cached to the local JSON store");

const authSession = read("server/authSession.ts");
assertContains(authSession, "crypto.timingSafeEqual", "session/password comparisons use timing-safe comparison");
assertContains(authSession, "payload.exp <= now", "expired signed sessions are rejected");
assertContains(authSession, "payload.user.schoolId", "session must carry a tenant identity");

console.log("Authentication cloud-source contract checks: PASS");
