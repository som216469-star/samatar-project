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
const migration = read("../supabase/migrations/20261011_authentication_phase_1.sql");
const emailService = read("../server/emailService.ts");
const canonicalSql = read("../DUGSI_PRO_2026_ALL_TABLES.sql");

assert.ok(server.includes('app.post("/api/auth/forgot-password"'), "forgot-password endpoint exists");
assert.ok(server.includes('app.post("/api/auth/reset-password"'), "reset-password endpoint exists");
assert.ok(server.includes("password_reset_token_hash"), "reset tokens are stored as hashes");
assert.ok(server.includes("password_reset_expires_at"), "reset tokens have an expiry");
assert.ok(server.includes("setSessionCookie(req, res, sessionToken)"), "signup issues a server-side session cookie");
assert.ok(server.includes("ensureProductionAuthBackend"), "production auth fails closed when cloud database is unavailable");
assert.ok(server.includes("if (!user) return res.status(401)"), "cloud login rejects missing accounts");
assert.ok(!server.includes("if (!cloudCheck.valid && !localCheck.valid)"), "local passwords cannot bypass cloud authentication");
assert.ok(server.includes("password-change:ip:"), "password reset attempts are rate limited");
assert.ok(session.includes("configuredSessionSecret.length < 32"), "production requires a dedicated secret of at least 32 characters");
assert.ok(session.includes("const SESSION_TTL_MS = 8 * 60 * 60 * 1000"), "session lifetime is limited to eight hours");
assert.ok(recoveryPage.includes("/api/auth/forgot-password"), "recovery UI calls forgot-password endpoint");
assert.ok(recoveryPage.includes("/api/auth/reset-password"), "reset UI calls reset-password endpoint");
assert.ok(recoveryPage.includes("30 daqiiqo gudahood"), "recovery UI explains 30-minute link expiry");
assert.ok(app.includes("publicRoute === 'forgot-password'"), "forgot-password route is wired into the app");
assert.ok(app.includes("publicRoute === 'reset-password'"), "reset-password route is wired into the app");
assert.ok(routeConfig.includes("publicRoute: 'forgot-password'"), "forgot-password path is parsed");
assert.ok(routeConfig.includes("publicRoute: 'reset-password'"), "reset-password path is parsed");
assert.ok(emailService.includes("sendPasswordResetEmail"), "password recovery email sender exists");
assert.ok(migration.includes("ADD COLUMN IF NOT EXISTS password_reset_token_hash"), "idempotent recovery migration exists");
assert.ok(canonicalSql.includes("password_reset_expires_at TIMESTAMPTZ"), "canonical schema has recovery expiry field");

console.log("Authentication Phase 1 contract checks: PASS");
