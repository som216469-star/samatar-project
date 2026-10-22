import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Production security contract failed: missing ${file}`);
  return fs.readFileSync(fullPath, "utf8");
}
function assertContains(source, snippet, label) {
  if (!source.includes(snippet)) throw new Error(`Production security contract failed: ${label}`);
}
function assertNotContains(source, snippet, label) {
  if (source.includes(snippet)) throw new Error(`Production security contract failed: ${label}`);
}

const server = read("server.ts");
const packageJson = JSON.parse(read("package.json"));
assertContains(server, 'let useLocalFallback = process.env.NODE_ENV !== "production";', "production begins in fail-closed mode");
assertNotContains(server, "useLocalFallback = true;", "runtime failures cannot enable production local-JSON fallback");
assertContains(server, 'if (process.env.NODE_ENV === "production" && (!supabaseUrl || !supabaseActiveKey || !supabase))', "production refuses to start without server-side Supabase configuration");
assertContains(server, 'code: "DATABASE_UNAVAILABLE"', "Supabase outage has a controlled unavailable response");
assertContains(server, 'pathName.startsWith("/fees")', "legacy fee endpoints inherit finance RBAC");
assertContains(server, 'if (pathName === "/settings") return read ? "settings.view" : "settings.manage";', "settings reads and writes require separate permissions");
assertContains(server, 'if (pathName === "/auth/logout" || pathName === "/user/profile") return null;', "only explicit self-service routes bypass route permissions");
const mapperStart = server.indexOf("function requiredPermissionForRequest");
const mapperEnd = server.indexOf("// Password hashing is centralized", mapperStart);
if (mapperStart < 0 || mapperEnd < 0) throw new Error("Production security contract failed: permission mapper missing");
assertContains(server.slice(mapperStart, mapperEnd), 'return "system.admin";', "unclassified authenticated API routes default to administrator-only");
const roleStart = server.indexOf("const ROLE_PERMISSIONS: Record<string, string[]> = {");
const roleEnd = server.indexOf("\nfunction normalizeRole", roleStart);
if (roleStart < 0 || roleEnd < 0) throw new Error("Production security contract failed: role map missing");
const roleMap = server.slice(roleStart, roleEnd);
for (const role of ["Principal", "Teacher", "Accountant", "Receptionist", "Librarian", "Staff"]) {
  const roleNeedle = `'${role}': [`;
  const index = roleMap.indexOf(roleNeedle);
  if (index < 0) throw new Error(`Production security contract failed: missing role ${role}`);
  const next = roleMap.indexOf("\n  '", index + 1);
  const block = roleMap.slice(index, next < 0 ? roleMap.length : next);
  assertContains(block, "'settings.view'", `${role} can read standard school settings`);
  assertNotContains(block, "'settings.manage'", `${role} cannot change school settings`);
}
assertContains(packageJson.scripts["test:production-security-contract"] || "", "production-security-contract.mjs", "contract test is wired into package scripts");
console.log("Production fail-closed and RBAC contract checks: PASS");
