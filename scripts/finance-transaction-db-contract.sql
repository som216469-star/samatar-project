\set ON_ERROR_STOP on

-- Minimal schema fixture for running the staged migration against PostgreSQL in CI.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END;
$roles$;

CREATE TABLE public.dugsiga_fee_structures (
  id text PRIMARY KEY, school_id text NOT NULL, name text, amount numeric
);
CREATE TABLE public.dugsiga_invoices (
  id text PRIMARY KEY,
  school_id text NOT NULL,
  invoice_number text NOT NULL,
  student_id text NOT NULL,
  student_name text,
  class_name text,
  guardian_name text,
  guardian_phone text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  issue_date text NOT NULL,
  due_date text NOT NULL,
  status text NOT NULL DEFAULT 'Unpaid',
  notes text,
  created_at text,
  updated_at text
);
CREATE TABLE public.dugsiga_fees (
  id text PRIMARY KEY,
  school_id text NOT NULL,
  student_id text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  amount numeric NOT NULL,
  paid_amount numeric NOT NULL,
  status text NOT NULL,
  created_at text,
  updated_at text,
  history jsonb
);
CREATE TABLE public.dugsiga_payments (
  id text PRIMARY KEY,
  school_id text NOT NULL,
  receipt_number text NOT NULL,
  invoice_id text,
  invoice_number text,
  student_id text,
  student_name text,
  class_name text,
  amount numeric NOT NULL DEFAULT 0,
  payment_date text NOT NULL,
  payment_method text NOT NULL DEFAULT 'Cash',
  reference text,
  remaining_balance numeric,
  received_by text NOT NULL,
  notes text,
  created_at text
);
CREATE TABLE public.dugsiga_expenses (
  id text PRIMARY KEY, school_id text NOT NULL, description text
);
CREATE TABLE public.dugsiga_income (
  id text PRIMARY KEY, school_id text NOT NULL, description text
);
CREATE TABLE public.dugsiga_payroll (
  id text PRIMARY KEY, school_id text NOT NULL, description text
);
CREATE TABLE public.dugsiga_budgets (
  id text PRIMARY KEY, school_id text NOT NULL, description text
);

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

\i supabase/migrations/20261021173729_atomic_finance_transactions.sql

-- Verify that only the trusted server role may execute the RPCs.
DO $privileges$
BEGIN
  IF pg_catalog.has_function_privilege('anon', 'public.dugsiga_finance_transaction(text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute the finance transaction RPC';
  END IF;
  IF pg_catalog.has_function_privilege('authenticated', 'public.dugsiga_record_invoice_payment(text,text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute the invoice payment RPC';
  END IF;
  IF NOT pg_catalog.has_function_privilege('service_role', 'public.dugsiga_finance_transaction(text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute the finance transaction RPC';
  END IF;
END;
$privileges$;

-- Seed a school invoice + legacy fee and prove paired upserts commit together.
SET ROLE service_role;
SELECT public.dugsiga_finance_transaction(
  'school-a',
  '[
    {"action":"upsert","table":"dugsiga_invoices","rows":[{
      "id":"invoice-a","school_id":"school-a","invoice_number":"INV-A","student_id":"student-a",
      "items":[],"subtotal":100,"discount":0,"total":100,"paid_amount":0,"balance":100,
      "issue_date":"2026-10-17","due_date":"2026-10-31","status":"Unpaid"
    }]},
    {"action":"upsert","table":"dugsiga_fees","rows":[{
      "id":"invoice-a","school_id":"school-a","student_id":"student-a","month":"October","year":2026,
      "amount":100,"paid_amount":0,"status":"unpaid"
    }]}
  ]'::jsonb
);
RESET ROLE;

DO $atomic_upsert$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dugsiga_invoices WHERE id = 'invoice-a' AND school_id = 'school-a') THEN
    RAISE EXCEPTION 'invoice upsert did not persist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dugsiga_fees WHERE id = 'invoice-a' AND school_id = 'school-a') THEN
    RAISE EXCEPTION 'legacy fee upsert did not persist';
  END IF;
END;
$atomic_upsert$;

-- A later invalid tenant row must roll back earlier writes in the same RPC call.
DO $rollback_test$
DECLARE
  v_rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.dugsiga_finance_transaction(
      'school-a',
      '[
        {"action":"upsert","table":"dugsiga_expenses","rows":[{"id":"must-rollback","school_id":"school-a","description":"rollback me"}]},
        {"action":"upsert","table":"dugsiga_income","rows":[{"id":"wrong-tenant","school_id":"school-b","description":"must reject"}]}
      ]'::jsonb
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'cross-tenant write should be rejected';
  END IF;
  IF EXISTS (SELECT 1 FROM public.dugsiga_expenses WHERE id = 'must-rollback') THEN
    RAISE EXCEPTION 'failed multi-row transaction left a partial write';
  END IF;
END;
$rollback_test$;

-- An ID owned by another tenant must not be overwritten.
INSERT INTO public.dugsiga_income (id, school_id, description)
VALUES ('shared-id', 'school-b', 'protected row');
DO $tenant_conflict$
DECLARE
  v_rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.dugsiga_finance_transaction(
      'school-a',
      '[{"action":"upsert","table":"dugsiga_income","rows":[{"id":"shared-id","school_id":"school-a","description":"malicious overwrite"}]}]'::jsonb
    );
  EXCEPTION WHEN unique_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'cross-school ID conflict should be rejected';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dugsiga_income
    WHERE id = 'shared-id' AND school_id = 'school-b' AND description = 'protected row'
  ) THEN
    RAISE EXCEPTION 'cross-school conflict altered the other school row';
  END IF;
END;
$tenant_conflict$;

-- Payment RPC must atomically update invoice, payment history and the linked fee.
SET ROLE service_role;
SELECT public.dugsiga_record_invoice_payment(
  'school-a',
  'invoice-a',
  '{
    "id":"payment-a","school_id":"school-a","receipt_number":"REC-A","amount":25,
    "payment_date":"2026-10-17","payment_method":"Cash","reference":"test",
    "received_by":"CI","notes":"atomic test","created_at":"2026-10-17T10:00:00Z"
  }'::jsonb
);
RESET ROLE;

DO $payment_test$
DECLARE
  v_failed boolean := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.dugsiga_invoices
    WHERE id = 'invoice-a' AND paid_amount = 25 AND balance = 75 AND status = 'Partially Paid'
  ) THEN
    RAISE EXCEPTION 'invoice payment totals are wrong';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dugsiga_fees
    WHERE id = 'invoice-a' AND paid_amount = 25 AND status = 'partially paid'
  ) THEN
    RAISE EXCEPTION 'linked legacy fee was not updated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dugsiga_payments
    WHERE id = 'payment-a' AND invoice_id = 'invoice-a' AND amount = 25 AND remaining_balance = 75
  ) THEN
    RAISE EXCEPTION 'payment receipt was not written correctly';
  END IF;

  -- Duplicate payment ID forces an INSERT failure; the invoice total must roll back too.
  BEGIN
    PERFORM public.dugsiga_record_invoice_payment(
      'school-a',
      'invoice-a',
      '{
        "id":"payment-a","school_id":"school-a","receipt_number":"REC-DUP","amount":10,
        "payment_date":"2026-10-17","payment_method":"Cash","reference":"duplicate",
        "received_by":"CI","notes":"must roll back","created_at":"2026-10-17T10:01:00Z"
      }'::jsonb
    );
  EXCEPTION WHEN unique_violation THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'duplicate payment ID should fail';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dugsiga_invoices WHERE id = 'invoice-a' AND paid_amount = 25 AND balance = 75) THEN
    RAISE EXCEPTION 'failed duplicate payment changed invoice totals';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dugsiga_fees WHERE id = 'invoice-a' AND paid_amount = 25) THEN
    RAISE EXCEPTION 'failed duplicate payment changed linked fee totals';
  END IF;
END;
$payment_test$;

SELECT 'Atomic finance SQL contract checks: PASS' AS result;
