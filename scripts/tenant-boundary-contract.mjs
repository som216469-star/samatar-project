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

assertContains(server, 'return authUser?.schoolId?.trim() || "";', "tenant comes from a verified server session");
assertContains(server, "return requireAuthenticatedRequest(req, res, next);", "protected API routes require a signed session");
assertContains(server, 'id: currentFee.id,\n        schoolId: currentFee.schoolId', "legacy fee updates preserve original id and tenant");

for (const [needle, label] of [
  ["id: currentStructure.id,\n      schoolId: currentStructure.schoolId", "fee-structure update preserves tenant"],
  ["id: current.id,\n      schoolId: current.schoolId,\n      feeId: current.feeId", "invoice update preserves tenant and legacy link"],
  ["id: currentExpense.id,\n      schoolId: currentExpense.schoolId", "expense update preserves tenant"],
  ["id: currentIncome.id,\n      schoolId: currentIncome.schoolId", "income update preserves tenant"],
  ["id: current.id,\n      schoolId: current.schoolId,\n      createdAt: current.createdAt", "payroll update preserves tenant"],
  ["id: currentBudget.id,\n      schoolId: currentBudget.schoolId", "budget update preserves tenant"],
  ["e.schoolId === schoolId && (e.payrollId === pr.id || e.id === expId)", "payroll payment cannot edit another school's expense"],
  ["!(e.schoolId === schoolId && (e.id === pr.expenseId || e.payrollId === id))", "payroll deletion is tenant-scoped"],
  ["f.id === id && f.schoolId === schoolId", "legacy fee linkage is tenant-scoped"]
]) {
  assertContains(finance, needle, label);
}

for (const [needle, label] of [
  ["id: currentTeacher.id,\n        schoolId: currentTeacher.schoolId", "teacher update preserves tenant"],
  ["id: currentStaff.id,\n        schoolId: currentStaff.schoolId", "staff update preserves tenant"],
  ["id: currentGuardian.id,\n        schoolId: currentGuardian.schoolId", "guardian update preserves tenant"],
  ["id: currentAdmission.id,\n        schoolId: currentAdmission.schoolId", "admission update preserves tenant"],
  ["id: currentAnnouncement.id,\n        schoolId: currentAnnouncement.schoolId", "announcement update preserves tenant"],
  ["id: currentBook.id,\n        schoolId: currentBook.schoolId", "library book update preserves tenant"],
  ["id: currentItem.id,\n        schoolId: currentItem.schoolId", "inventory update preserves tenant"],
  ['.eq("id", loan.bookId)\n          .eq("school_id", schoolId)', "loan book lookup is tenant-scoped"],
  ['.eq("id", returnedLoan.book_id)\n          .eq("school_id", schoolId)', "returned book stock update is tenant-scoped"],
  ["b.id === loan.bookId && b.schoolId === schoolId", "local library stock changes are tenant-scoped"]
]) {
  assertContains(modern, needle, label);
}

console.log("Tenant boundary contract checks: PASS");
