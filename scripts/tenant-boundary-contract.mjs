import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Tenant boundary contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Tenant boundary contract failed: ${label}`);
  }
}

const server = read("server.ts");
const modern = read("server/modernRoutes.ts");
const finance = read("server/financeRoutes.ts");
const migration = read("supabase/migrations/20261021173729_atomic_finance_transactions.sql");

// Tenant identity must come from the verified server session, not client headers.
assertContains(server, 'return authUser?.schoolId?.trim() || "";', "tenant comes from verified server session");

// Legacy fee routes must scope both cloud and local operations to the authenticated school.
assertContains(server, '.eq("id", id).eq("school_id", schoolId);', "legacy fee cloud update/delete includes tenant predicate");
assertContains(server, "f.id === id && f.schoolId === schoolId", "legacy fee local update/delete includes tenant predicate");

// Modern entity updates must be scoped in Supabase and in the local-only fallback.
for (const [needle, label] of [
  ['.eq("id", id)\n          .eq("school_id", schoolId);', "modern updates include id and school predicates"],
  ["t.id === id && t.schoolId === schoolId", "teacher fallback update includes tenant predicate"],
  ["s.id === id && s.schoolId === schoolId", "staff fallback update includes tenant predicate"],
  ["g.id === id && g.schoolId === schoolId", "guardian fallback update includes tenant predicate"],
  ["a.id === id && a.schoolId === schoolId", "admission/announcement fallback update includes tenant predicate"],
  ["b.id === id && b.schoolId === schoolId", "library book fallback update includes tenant predicate"],
  ["i.id === id && i.schoolId === schoolId", "inventory fallback update includes tenant predicate"],
  ["b.id === loan.bookId && b.schoolId === schoolId", "library loan stock changes include tenant predicate"],
  ['.eq("id", loan.bookId)\n          .eq("school_id", schoolId)', "library loan cloud stock update is tenant-scoped"],
  ['.eq("id", book.id)\n              .eq("school_id", schoolId)', "library return cloud stock increment/rollback is tenant-scoped"],
  ['.eq("id", id)\n          .eq("school_id", schoolId)\n          .eq("status", "Borrowed")', "library return changes only this tenant's borrowed loan"]
]) {
  assertContains(modern, needle, label);
}

// Finance routes refresh authoritative rows per tenant and preserve tenant identity on edits.
assertContains(finance, 'const { authorized, schoolId } = checkFinanceAuth(req, "finance.manage");', "finance mutations require finance authorization and tenant identity");
assertContains(finance, '.eq("school_id", schoolId)', "finance source reads are scoped to the authenticated school");
assertContains(finance, "findIndex((inv: any) => inv.id === id && inv.schoolId === schoolId)", "invoice update is tenant-scoped");
assertContains(finance, "schoolId: current.schoolId", "finance edits cannot replace the original tenant identity");

// Atomic writes additionally validate tenant identity inside the database transaction.
assertContains(migration, "v_row ->> 'school_id' IS DISTINCT FROM p_school_id", "atomic upserts reject mismatched tenant ids");
assertContains(migration, "existing.school_id = $2 AND EXCLUDED.school_id = $2", "conflicting ids cannot be moved between tenants");
assertContains(migration, "WHERE id = p_invoice_id AND school_id = p_school_id", "invoice payment locks and updates only the scoped tenant row");

console.log("Tenant boundary contract checks: PASS");
