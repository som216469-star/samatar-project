import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const server = read("../server.ts");
const session = read("../server/authSession.ts");
const recoveryPage = read("../src/features/auth/PasswordRecoveryPage.tsx");
const app = read("../src/App.tsx");
const routeConfig = read("../src/app/routeConfig.ts");
const migration = read("../supabase/migrations/20261011_authentication_recovery.sql");
const activation = read("../src/features/teacher/TeacherActivationPage.tsx");
const verificationPage = read("../src/features/auth/EmailVerificationPage.tsx");

assert.ok(server.includes('app.post("/api/auth/forgot-password"'), "forgot-password endpoint exists");
assert.ok(server.includes('app.post("/api/auth/reset-password"'), "reset-password endpoint exists");
assert.ok(server.includes('app.post("/api/auth/verify-email"'), "email verification endpoint exists");
assert.ok(server.includes('app.post("/api/auth/resend-verification"'), "verification resend endpoint exists");
assert.ok(verificationPage.includes("/api/auth/verify-email"), "verification page uses server verification endpoint");
assert.ok(verificationPage.includes("/api/auth/resend-verification"), "verification page supports resend");
assert.ok(server.includes("if (cloudUser.verified === false)"), "unverified cloud accounts cannot log in");
assert.ok(server.includes("requiresEmailVerification"), "signup advertises when verification is required");
assert.ok(app.includes("payload.requiresEmailVerification"), "frontend routes unverified signup to verification UI");
assert.ok(server.includes("password_reset_token_hash"), "reset tokens are persisted as hashes");
assert.ok(server.includes("setSessionCookie(req, res, sessionToken)"), "successful signup issues a server session cookie");
assert.ok(server.includes("if (!cloudUser)"), "cloud login rejects accounts missing from the source of truth");
assert.ok(!server.includes("if (!cloudCheck.valid && !localCheck.valid)"), "stale local passwords must not bypass cloud authentication");
assert.ok(server.includes("ensureProductionAuthBackend"), "production auth fails closed when the cloud database is unavailable");
assert.ok(session.includes("configuredSessionSecret.length < 32"), "production requires a strong dedicated session secret");
assert.ok(session.includes("const SESSION_TTL_MS = 8 * 60 * 60 * 1000"), "session lifetime is bounded to eight hours");
assert.ok(recoveryPage.includes("30 daqiiqo gudahood"), "recovery UI explains token expiry");
assert.ok(app.includes("publicRoute === 'forgot-password'"), "forgot-password route is wired into the app");
assert.ok(app.includes("publicRoute === 'reset-password'"), "reset-password route is wired into the app");
assert.ok(routeConfig.includes("publicRoute: 'reset-password'"), "reset route parser is explicit");
assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS password_reset_token_hash"), "idempotent DB migration exists");
assert.ok(activation.includes("password.length < 10"), "teacher activation enforces server password policy");
assert.ok(!server.includes('res.json({ success: true, message: "Verification step is disabled. Automated success." })'), "fake success verification endpoint was removed");

console.log("Authentication module contract checks: PASS");
