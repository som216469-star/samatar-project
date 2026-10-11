import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`RBAC security contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}
function assertContains(source, value, label) {
  if (!source.includes(value)) throw new Error(`RBAC security contract failed: ${label}`);
}
function assertNotContains(source, value, label) {
  if (source.includes(value)) throw new Error(`RBAC security contract failed: ${label}`);
}

const server = read("server.ts");
const roleStart = server.indexOf("// Only two internal roles are supported.");
const roleEnd = server.indexOf("function hasPermission(", roleStart);
if (roleStart < 0 || roleEnd <= roleStart) {
  throw new Error("RBAC security contract failed: role policy boundaries not found");
}
const rolePolicy = server.slice(roleStart, roleEnd);

assertContains(rolePolicy, 'admin: ["*"]', "admin is the sole full-access role");
assertContains(rolePolicy, 'teacher: [', "teacher has an explicit least-privilege allowlist");
assertContains(rolePolicy, 'if (["admin", "administrator", "school admin", "super admin"].includes(normalized)) return "admin";', "legacy administrator roles normalize to admin");
assertContains(rolePolicy, 'if (normalized === "teacher") return "teacher";', "teacher canonical role");
assertContains(rolePolicy, 'return "";', "unsupported roles fail closed");
for (const unsupportedRole of ["Accountant", "Principal", "Receptionist", "Librarian", "Staff"]) {
  assertNotContains(rolePolicy, unsupportedRole, `${unsupportedRole} is not a supported internal role`);
}

assertContains(server, 'if (pathName === "/user/profile" || pathName === "/auth/logout") return null;', "profile/logout exceptions stay explicit");
assertContains(server, 'return "system.admin";', "unknown routes are administrator-only by default");
assertContains(server, "if (!hasPermission(authUser.role, requiredPermission))", "central API middleware enforces the permission map");
assertContains(server, 'normalizeRole(authUser.role) === "admin"', "sensitive student fields are admin-only");
assertContains(server, "const normalizedCloudRole = normalizeRole(String(user.role || \"\"));", "cloud login canonicalizes the database role");
assertContains(server, 'if (!normalizedCloudRole) {', "unsupported cloud roles cannot create a session");
assertContains(server, 'role: "admin",', "administrator sessions use the canonical role");
assertContains(server, 'role: "teacher",', "teacher sessions use the canonical role");
assertContains(server, "const userRecord = (db.users || []).find((u: any) =>", "local login resolves a persisted identity");
assertContains(server, 'if (!userRecord) {', "missing identity does not default to administrator");
assertNotContains(server, 'role: userRecord?.role || "admin"', "missing role cannot escalate to administrator");
assertContains(server, 'if (status === "DEACTIVATED" || status === "INACTIVE")', "inactive teacher accounts cannot sign in");

console.log("RBAC security contract checks: PASS");
