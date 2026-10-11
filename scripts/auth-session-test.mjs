import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "authentication-phase-one-test-secret-with-more-than-32-characters";

const auth = await import("../server/authSession.ts");
const { parseAppLocation } = await import("../src/app/routeConfig.ts");

const user = {
  email: "teacher@school.test",
  role: "teacher",
  schoolId: "school-001",
  teacherId: "teacher-001",
  assignedClasses: ["Grade 7"],
  assignedSubjects: ["Math"]
};

const token = auth.createSessionToken(user);
assert.equal(typeof token, "string");
assert.deepEqual(auth.getSession(token), user, "valid signed session returns expected identity");

const parts = token.split(".");
parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
assert.equal(auth.getSession(parts.join(".")), null, "tampered session signature is rejected");

assert.equal(auth.revokeSession(token), true, "valid session can be revoked");
assert.equal(auth.getSession(token), null, "revoked session cannot authenticate");

assert.equal(auth.validatePassword("123456789").valid, false, "nine-character password is rejected");
assert.equal(auth.validatePassword("1234567890").valid, true, "ten-character password is accepted");
assert.equal(auth.validatePassword("x".repeat(129)).valid, false, "oversized password is rejected");

const passwordHash = await auth.hashPassword("A Secure Test Password 42!");
assert.match(passwordHash, /^scrypt\$/);
assert.equal((await auth.verifyPassword("A Secure Test Password 42!", passwordHash)).valid, true);
assert.equal((await auth.verifyPassword("wrong password", passwordHash)).valid, false);
assert.equal(
  (await auth.verifyPassword("legacy-password", auth.legacyPasswordHash("legacy-password"))).needsRehash,
  true,
  "legacy hashes should be upgraded after successful login"
);

assert.equal(parseAppLocation("/forgot-password").publicRoute, "forgot-password");
assert.equal(parseAppLocation("/reset-password", "?token=reset-token").publicRoute, "reset-password");
assert.equal(parseAppLocation("/activate-teacher", "?token=invite-token").publicRoute, "activate-teacher");

console.log("Authentication Phase 1 session tests: PASS");
