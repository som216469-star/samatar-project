import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Finance source-of-truth contract failed: missing ${rel}`);
  return fs.readFileSync(file, "utf8");
}
function assertContains(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Finance source-of-truth contract failed: ${label}`);
}
function assertNotContains(text, needle, label) {
  if (text.includes(needle)) throw new Error(`Finance source-of-truth contract failed: ${label}`);
}
function routeBlock(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`Finance source-of-truth contract failed: route missing: ${signature}`);
  const next = source.indexOf("\n  app.", start + signature.length);
  return source.slice(start, next < 0 ? source.length : next);
}

const finance = read("server/financeRoutes.ts");
assertContains(finance, "const refreshFinanceCollectionsFromSupabase =", "finance cache refresh helper exists");
assertContains(finance, '.eq("school_id", schoolId)', "every cloud refresh is scoped to the authenticated school");
assertContains(finance, "rows: (data || []).map(definition.map)", "zero-row cloud responses are accepted as authoritative, not replaced by stale cache");
assertContains(finance, "if (error) {", "Supabase read failures are detected");
assertContains(finance, "const refreshFinanceOrFail =", "read failures are surfaced to callers");
assertContains(finance, 'code: "DATABASE_UNAVAILABLE"', "database failures use an explicit unavailable error");
assertContains(finance, "const syncFinanceRowsToSupabase =", "bulk writes use explicit error handling");
assertContains(finance, "const { error } = await supabase.from(table).upsert(rows, { onConflict: \"id\" })", "upsert errors are checked rather than swallowed");
assertContains(finance, "const deleteFinanceRowFromSupabase =", "delete persistence helper exists");
assertContains(finance, "const { error } = await supabase", "delete operation checks errors");
assertContains(finance, "const toSupabaseFinanceRow =", "authoritative finance rows are mapped to the DB schema");
assertContains(finance, "if (getUseLocalFallback()) syncLegacyFeesToInvoices(schoolId);", "legacy fee bridging is limited to local fallback mode");
assertNotContains(finance, "\n    await syncFinanceTableToSupabase(\"dugsiga_payroll\"", "no unguarded direct payroll persistence calls remain");

for (const route of [
  '  app.get("/api/fee-structures", async (req, res) => {',
  '  app.get("/api/invoices", async (req, res) => {',
  '  app.get("/api/payments", async (req, res) => {',
  '  app.get("/api/expenses", async (req, res) => {',
  '  app.get("/api/income", async (req, res) => {',
  '  app.get("/api/payroll", async (req, res) => {',
  '  app.get("/api/budgets", async (req, res) => {',
  '  app.get("/api/profit-loss", async (req, res) => {',
  '  app.get("/api/cash-flow", async (req, res) => {',
  '  app.get("/api/finance/stats", async (req, res) => {',
  '  app.get("/api/financial-reports", async (req, res) => {'
]) {
  const block = routeBlock(finance, route);
  assertContains(block, "refreshFinanceOrFail", `read endpoint refreshes Supabase data: ${route}`);
}

for (const route of [
  '  app.post("/api/fee-structures", async (req, res) => {',
  '  app.put("/api/fee-structures/:id", async (req, res) => {',
  '  app.delete("/api/fee-structures/:id", async (req, res) => {',
  '  app.post("/api/invoices", async (req, res) => {',
  '  app.post("/api/invoices/bulk", async (req, res) => {',
  '  app.put("/api/invoices/:id", async (req, res) => {',
  '  app.delete("/api/invoices/:id", async (req, res) => {',
  '  app.post("/api/payments", async (req, res) => {',
  '  app.post("/api/expenses", async (req, res) => {',
  '  app.put("/api/expenses/:id", async (req, res) => {',
  '  app.put("/api/expenses/:id/approve", async (req, res) => {',
  '  app.delete("/api/expenses/:id", async (req, res) => {',
  '  app.post("/api/income", async (req, res) => {',
  '  app.put("/api/income/:id", async (req, res) => {',
  '  app.delete("/api/income/:id", async (req, res) => {',
  '  app.post("/api/payroll", async (req, res) => {',
  '  app.put("/api/payroll/:id", async (req, res) => {',
  '  app.put("/api/payroll/:id/pay", async (req, res) => {',
  '  app.delete("/api/payroll/:id", async (req, res) => {',
  '  app.post("/api/budgets", async (req, res) => {',
  '  app.put("/api/budgets/:id", async (req, res) => {',
  '  app.delete("/api/budgets/:id", async (req, res) => {'
]) {
  const block = routeBlock(finance, route);
  assertContains(block, "refreshFinanceOrFail", `mutation refreshes current cloud records before editing: ${route}`);
}

for (const route of [
  '  app.post("/api/invoices/bulk", async (req, res) => {',
  '  app.put("/api/payroll/:id", async (req, res) => {',
  '  app.put("/api/payroll/:id/pay", async (req, res) => {',
  '  app.delete("/api/payroll/:id", async (req, res) => {',
  '  app.put("/api/budgets/:id", async (req, res) => {',
  '  app.delete("/api/budgets/:id", async (req, res) => {'
]) {
  const block = routeBlock(finance, route);
  if (!block.includes("syncFinance") && !block.includes("deleteFinanceRowFromSupabase")) {
    throw new Error(`Finance source-of-truth contract failed: previously cache-only mutation has no Supabase persistence: ${route}`);
  }
}

const migration = read("supabase/migrations/20261021173729_atomic_finance_transactions.sql");
assertContains(finance, "const syncFinanceTransaction =", "atomic finance transaction helper exists");
assertContains(finance, 'supabase.rpc("dugsiga_finance_transaction"', "related finance rows use the atomic Supabase transaction RPC");
assertContains(finance, 'supabase.rpc("dugsiga_record_invoice_payment"', "invoice payments use the row-locking database transaction");
assertContains(migration, "CREATE OR REPLACE FUNCTION public.dugsiga_finance_transaction", "atomic batch transaction migration exists");
assertContains(migration, "CREATE OR REPLACE FUNCTION public.dugsiga_record_invoice_payment", "atomic invoice-payment migration exists");
assertContains(migration, "FOR UPDATE", "invoice payment locks the invoice row before calculating the new balance");
assertContains(migration, "v_row ->> 'school_id' IS DISTINCT FROM p_school_id", "atomic finance upserts validate tenant identity");
assertContains(migration, "existing.school_id = $2 AND EXCLUDED.school_id = $2", "conflicting rows cannot be reassigned across schools");
assertContains(migration, "REVOKE ALL ON FUNCTION public.dugsiga_finance_transaction(text, jsonb) FROM PUBLIC", "transaction RPC is not public");
assertContains(migration, "GRANT EXECUTE ON FUNCTION public.dugsiga_finance_transaction(text, jsonb) TO service_role", "only trusted server role receives execute permission");
assertNotContains(migration, "SECURITY DEFINER", "finance RPCs do not bypass RLS with SECURITY DEFINER");

for (const route of [
  '  app.post("/api/invoices", async (req, res) => {',
  '  app.post("/api/invoices/bulk", async (req, res) => {',
  '  app.put("/api/invoices/:id", async (req, res) => {',
  '  app.delete("/api/invoices/:id", async (req, res) => {',
  '  app.put("/api/payroll/:id/pay", async (req, res) => {',
  '  app.delete("/api/payroll/:id", async (req, res) => {'
]) {
  assertContains(routeBlock(finance, route), "syncFinanceTransaction", `related writes are transactional: ${route}`);
}
const paymentRoute = routeBlock(finance, '  app.post("/api/payments", async (req, res) => {');
assertContains(paymentRoute, "dugsiga_record_invoice_payment", "payment recording uses atomic database logic");
assertContains(paymentRoute, "financeCollectionDefinitions.invoices.map(data.invoice)", "atomic payment result refreshes the local invoice cache");
console.log("Finance Supabase source-of-truth contract checks: PASS");
