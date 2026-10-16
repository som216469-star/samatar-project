import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Tenant boundary contract failed: missing ${rel}`);
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function assertContains(content, needle, label) {
  if (!content.includes(needle)) throw new Error(`Tenant boundary contract failed: ${label}`);
}
const server = read("server.ts");
const modern = read("server/modernRoutes.ts");
const finance = read("server/financeRoutes.ts");

assertContains(server, 'return authUser?.schoolId?.trim() || "";', "tenant comes from verified session");
assertContains(server, "return requireAuthenticatedRequest(req, res, next);", "protected API requires signed session");
assertContains(server, "id: currentFee.id,\n        schoolId: currentFee.schoolId", "legacy fee identity preserved");

for (const [needle,label] of [
 ["id: currentStructure.id,\n      schoolId: currentStructure.schoolId","fee structure tenant preserved"],
 ["id: current.id,\n      schoolId: current.schoolId,\n      feeId: current.feeId","invoice tenant and fee linkage preserved"],
 ["id: currentExpense.id,\n      schoolId: currentExpense.schoolId","expense tenant preserved"],
 ["id: currentIncome.id,\n      schoolId: currentIncome.schoolId","income tenant preserved"],
 ["id: currentBudget.id,\n      schoolId: currentBudget.schoolId","budget tenant preserved"],
 ["e.schoolId === schoolId && (e.payrollId === pr.id || e.id === expId)","payroll-to-expense lookup is scoped"],
 ["!(e.schoolId === schoolId && (e.id === pr.expenseId || e.payrollId === id))","payroll deletion is scoped"],
 ["f.id === invoiceId && f.schoolId === schoolId","fee lookup is scoped"]
]) assertContains(finance,needle,label);

for (const [needle,label] of [
 ["id: currentTeacher.id,\n        schoolId: currentTeacher.schoolId","teacher tenant preserved"],
 ["id: currentStaff.id,\n        schoolId: currentStaff.schoolId","staff tenant preserved"],
 ["id: currentGuardian.id,\n        schoolId: currentGuardian.schoolId","guardian tenant preserved"],
 ["id: currentAdmission.id,\n        schoolId: currentAdmission.schoolId","admission tenant preserved"],
 ["id: currentAnnouncement.id,\n        schoolId: currentAnnouncement.schoolId","announcement tenant preserved"],
 ["id: currentBook.id,\n        schoolId: currentBook.schoolId","library book tenant preserved"],
 ["id: currentItem.id,\n        schoolId: currentItem.schoolId","inventory tenant preserved"],
 ['.eq("id", loan.bookId)\n          .eq("school_id", schoolId)',"library book lookup is scoped"],
 ['.eq("id", returnedLoan.book_id)\n            .eq("school_id", schoolId)',"library stock write is scoped"],
 ["b.id === loan.bookId && b.schoolId === schoolId","local book lookup is scoped"]
]) assertContains(modern,needle,label);

console.log("Tenant boundary contract checks: PASS");
