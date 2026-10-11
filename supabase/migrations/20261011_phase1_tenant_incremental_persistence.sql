-- DUGSI PRO 2026 — Phase 1 tenant-scoped incremental persistence.
-- All changes from one request are applied in a single PostgreSQL transaction.
-- The function never accepts a client-selected tenant: the server passes the
-- tenant from the verified session and every row must match it.

CREATE OR REPLACE FUNCTION public.dugsiga_apply_tenant_changes(
  p_school_id text,
  p_changes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_change jsonb;
  v_row jsonb;
  v_table text;
  v_operation text;
  v_columns text;
  v_select_values text;
  v_updates text;
  v_primary_key text;
  v_sql text;
  v_affected integer;
BEGIN
  IF p_school_id IS NULL OR btrim(p_school_id) = '' THEN
    RAISE EXCEPTION 'A verified school_id is required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Changes must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_changes) > 2000 THEN
    RAISE EXCEPTION 'Too many changes in one request' USING ERRCODE = '22023';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(p_changes)
  LOOP
    v_table := v_change->>'table';
    v_operation := v_change->>'operation';
    v_row := COALESCE(v_change->'row', '{}'::jsonb);

    IF v_table IS NULL OR v_table NOT IN (
      'dugsiga_users', 'dugsiga_students', 'dugsiga_classes',
      'dugsiga_subjects', 'dugsiga_exam_scores', 'dugsiga_attendance',
      'dugsiga_fees', 'dugsiga_settings', 'dugsiga_teachers',
      'dugsiga_staff', 'dugsiga_guardians', 'dugsiga_staff_attendance',
      'dugsiga_timetable', 'dugsiga_admissions', 'dugsiga_announcements',
      'dugsiga_library_books', 'dugsiga_library_loans', 'dugsiga_inventory',
      'dugsiga_documents', 'dugsiga_notifications', 'dugsiga_fee_structures',
      'dugsiga_invoices', 'dugsiga_payments', 'dugsiga_expenses',
      'dugsiga_income', 'dugsiga_budgets', 'dugsiga_payroll'
    ) THEN
      RAISE EXCEPTION 'Table is not allowed for incremental persistence: %', v_table
        USING ERRCODE = '42501';
    END IF;

    IF v_operation IS NULL OR v_operation NOT IN ('upsert', 'delete') THEN
      RAISE EXCEPTION 'Unsupported operation: %', v_operation USING ERRCODE = '22023';
    END IF;

    IF v_row->>'school_id' IS DISTINCT FROM p_school_id THEN
      RAISE EXCEPTION 'Tenant mismatch in change for %', v_table USING ERRCODE = '42501';
    END IF;

    IF v_table = 'dugsiga_users' THEN
      v_primary_key := 'email';
    ELSIF v_table = 'dugsiga_attendance' THEN
      v_primary_key := 'school_id,date,student_id,session_type';
    ELSIF v_table = 'dugsiga_settings' THEN
      v_primary_key := 'school_id,key';
    ELSE
      v_primary_key := 'id';
    END IF;

    IF v_operation = 'delete' THEN
      IF v_table = 'dugsiga_users' THEN
        IF COALESCE(v_row->>'email', '') = '' THEN
          RAISE EXCEPTION 'Email key is required for user deletion' USING ERRCODE = '22023';
        END IF;
        EXECUTE 'DELETE FROM public.dugsiga_users WHERE school_id = $1 AND email = $2'
          USING p_school_id, v_row->>'email';
      ELSIF v_table = 'dugsiga_attendance' THEN
        IF COALESCE(v_row->>'date', '') = ''
           OR COALESCE(v_row->>'student_id', '') = ''
           OR COALESCE(v_row->>'session_type', '') = '' THEN
          RAISE EXCEPTION 'Composite attendance key is incomplete' USING ERRCODE = '22023';
        END IF;
        EXECUTE 'DELETE FROM public.dugsiga_attendance
                 WHERE school_id = $1 AND date = $2 AND student_id = $3 AND session_type = $4'
          USING p_school_id, v_row->>'date', v_row->>'student_id', v_row->>'session_type';
      ELSIF v_table = 'dugsiga_settings' THEN
        IF COALESCE(v_row->>'key', '') = '' THEN
          RAISE EXCEPTION 'Settings key is required for deletion' USING ERRCODE = '22023';
        END IF;
        EXECUTE 'DELETE FROM public.dugsiga_settings WHERE school_id = $1 AND key = $2'
          USING p_school_id, v_row->>'key';
      ELSE
        IF COALESCE(v_row->>'id', '') = '' THEN
          RAISE EXCEPTION 'ID key is required for deletion from %', v_table USING ERRCODE = '22023';
        END IF;
        EXECUTE format('DELETE FROM public.%I WHERE school_id = $1 AND id = $2', v_table)
          USING p_school_id, v_row->>'id';
      END IF;
      CONTINUE;
    END IF;

    IF v_table = 'dugsiga_users' AND COALESCE(v_row->>'email', '') = '' THEN
      RAISE EXCEPTION 'Email key is required for user upsert' USING ERRCODE = '22023';
    ELSIF v_table NOT IN ('dugsiga_users', 'dugsiga_attendance', 'dugsiga_settings')
      AND COALESCE(v_row->>'id', '') = '' THEN
      RAISE EXCEPTION 'ID key is required for upsert into %', v_table USING ERRCODE = '22023';
    ELSIF v_table = 'dugsiga_attendance'
      AND (COALESCE(v_row->>'date', '') = ''
        OR COALESCE(v_row->>'student_id', '') = ''
        OR COALESCE(v_row->>'session_type', '') = '') THEN
      RAISE EXCEPTION 'Composite attendance key is incomplete' USING ERRCODE = '22023';
    ELSIF v_table = 'dugsiga_settings' AND COALESCE(v_row->>'key', '') = '' THEN
      RAISE EXCEPTION 'Settings key is required' USING ERRCODE = '22023';
    END IF;

    -- Only actual columns on the selected public table are accepted. Keys and
    -- values are derived from JSON, but identifiers are quoted via format().
    SELECT
      string_agg(format('%I', a.attname), ', ' ORDER BY k.ordinality),
      string_agg(
        format('(jsonb_populate_record(NULL::public.%I, $1)).%I', v_table, a.attname),
        ', ' ORDER BY k.ordinality
      ),
      string_agg(
        format('%I = EXCLUDED.%I', a.attname, a.attname),
        ', ' ORDER BY k.ordinality
      ) FILTER (
        WHERE NOT (a.attname = ANY(string_to_array(v_primary_key, ',')))
        AND a.attname <> 'school_id'
      )
    INTO v_columns, v_select_values, v_updates
    FROM jsonb_object_keys(v_row) WITH ORDINALITY AS k(key, ordinality)
    JOIN pg_attribute a
      ON a.attrelid = format('public.%I', v_table)::regclass
     AND a.attname = k.key
     AND a.attnum > 0
     AND NOT a.attisdropped;

    IF v_columns IS NULL OR position('school_id' IN v_columns) = 0 THEN
      RAISE EXCEPTION 'Change for % has no valid tenant-scoped columns', v_table
        USING ERRCODE = '22023';
    END IF;

    IF v_updates IS NULL OR v_updates = '' THEN
      RAISE EXCEPTION 'Change for % has no updatable columns', v_table
        USING ERRCODE = '22023';
    END IF;

    v_sql := format(
      'INSERT INTO public.%I AS target (%s) SELECT %s ' ||
      'ON CONFLICT (%s) DO UPDATE SET %s ' ||
      'WHERE target.school_id = EXCLUDED.school_id RETURNING 1',
      v_table,
      v_columns,
      v_select_values,
      (SELECT string_agg(format('%I', trim(x)), ', ')
         FROM unnest(string_to_array(v_primary_key, ',')) AS x),
      v_updates
    );

    EXECUTE v_sql INTO v_affected USING v_row;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected = 0 THEN
      RAISE EXCEPTION 'Tenant conflict while saving row to %', v_table
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.dugsiga_apply_tenant_changes(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_apply_tenant_changes(text, jsonb) TO service_role;


-- Atomic payment: lock the invoice, compute its new balance, write payment,
-- update legacy fee mirror, and return both records within one transaction.
CREATE OR REPLACE FUNCTION public.dugsiga_record_payment(
  p_school_id text,
  p_invoice_id text,
  p_amount numeric,
  p_payment jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_invoice public.dugsiga_invoices%ROWTYPE;
  v_payment public.dugsiga_payments%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
  v_status text;
BEGIN
  IF p_school_id IS NULL OR btrim(p_school_id) = '' OR p_invoice_id IS NULL OR btrim(p_invoice_id) = '' THEN
    RAISE EXCEPTION 'School and invoice are required' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive' USING ERRCODE = '22023';
  END IF;
  IF p_payment->>'school_id' IS DISTINCT FROM p_school_id THEN
    RAISE EXCEPTION 'Payment tenant does not match the active school' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice
  FROM public.dugsiga_invoices
  WHERE id = p_invoice_id AND school_id = p_school_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found for this school' USING ERRCODE = 'P0002';
  END IF;

  v_paid := COALESCE(v_invoice.paid_amount, 0) + p_amount;
  IF v_paid > COALESCE(v_invoice.total, 0) THEN
    RAISE EXCEPTION 'Payment exceeds the remaining invoice balance' USING ERRCODE = '22023';
  END IF;
  v_balance := GREATEST(0, COALESCE(v_invoice.total, 0) - v_paid);
  v_status := CASE WHEN v_balance = 0 THEN 'Paid' ELSE 'Partially Paid' END;

  UPDATE public.dugsiga_invoices
  SET paid_amount = v_paid, balance = v_balance, status = v_status,
      updated_at = COALESCE(NULLIF(p_payment->>'created_at', '')::text, now()::text)
  WHERE id = p_invoice_id AND school_id = p_school_id
  RETURNING * INTO v_invoice;

  UPDATE public.dugsiga_fees
  SET paid_amount = v_paid, status = lower(v_status)
  WHERE id = p_invoice_id AND school_id = p_school_id;

  INSERT INTO public.dugsiga_payments (
    id, school_id, receipt_number, invoice_id, invoice_number, student_id,
    student_name, class_name, amount, payment_date, payment_method, reference,
    remaining_balance, received_by, notes, created_at
  )
  VALUES (
    p_payment->>'id', p_school_id, p_payment->>'receipt_number',
    p_invoice_id, v_invoice.invoice_number, v_invoice.student_id,
    COALESCE(v_invoice.student_name, ''), COALESCE(v_invoice.class_name, ''),
    p_amount, COALESCE(NULLIF(p_payment->>'payment_date', ''), current_date::text),
    COALESCE(NULLIF(p_payment->>'payment_method', ''), 'Cash'),
    p_payment->>'reference', v_balance,
    COALESCE(NULLIF(p_payment->>'received_by', ''), 'Xisaabiyaha'),
    COALESCE(p_payment->>'notes', ''), COALESCE(NULLIF(p_payment->>'created_at', '')::timestamptz, now())
  )
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'invoice', to_jsonb(v_invoice));
END;
$function$;

REVOKE ALL ON FUNCTION public.dugsiga_record_payment(text, text, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_record_payment(text, text, numeric, jsonb) TO service_role;

-- Atomic payroll settlement: the payroll row and its linked paid expense are
-- committed together, and the stable expense primary key makes retries idempotent.
CREATE OR REPLACE FUNCTION public.dugsiga_mark_payroll_paid(
  p_school_id text,
  p_payroll_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payroll public.dugsiga_payroll%ROWTYPE;
  v_expense public.dugsiga_expenses%ROWTYPE;
  v_expense_id text;
  v_paid_at timestamptz := now();
  v_expense_number text;
BEGIN
  IF p_school_id IS NULL OR btrim(p_school_id) = '' OR p_payroll_id IS NULL OR btrim(p_payroll_id) = '' THEN
    RAISE EXCEPTION 'School and payroll ID are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payroll
  FROM public.dugsiga_payroll
  WHERE id = p_payroll_id AND school_id = p_school_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll record not found for this school' USING ERRCODE = 'P0002';
  END IF;

  v_expense_id := COALESCE(NULLIF(v_payroll.expense_id, ''), 'exp-pr-' || v_payroll.id);
  v_expense_number := 'EXP-SAL-' || EXTRACT(YEAR FROM v_paid_at)::text || '-' || upper(substr(md5(v_payroll.id), 1, 8));

  UPDATE public.dugsiga_payroll
  SET status = 'Paid', paid_at = COALESCE(v_payroll.paid_at, v_paid_at),
      expense_id = v_expense_id, updated_at = v_paid_at::text
  WHERE id = p_payroll_id AND school_id = p_school_id
  RETURNING * INTO v_payroll;

  INSERT INTO public.dugsiga_expenses AS target (
    id, school_id, expense_id, category, description, amount, date, payment_method,
    vendor_payee, reference_number, created_by, notes, status, payroll_id, created_at, updated_at
  )
  VALUES (
    v_expense_id, p_school_id, v_expense_number, 'Salaries',
    'Mushahar / Salary: ' || v_payroll.employee_name || ' (' || v_payroll.payroll_period || ')',
    COALESCE(v_payroll.net_salary, 0),
    COALESCE(NULLIF(v_payroll.payment_date, ''), current_date::text),
    COALESCE(NULLIF(v_payroll.payment_method, ''), 'Bank'),
    v_payroll.employee_name,
    'PAYROLL-' || upper(right(v_payroll.id, 5)),
    'Payroll System',
    'Basic: ' || COALESCE(v_payroll.basic_salary, 0)::text ||
      ', Allowances: ' || COALESCE(v_payroll.allowances, 0)::text ||
      ', Deductions: ' || COALESCE(v_payroll.deductions, 0)::text,
    'Paid', v_payroll.id, COALESCE(v_payroll.created_at, v_paid_at::text), v_paid_at::text
  )
  ON CONFLICT (id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    expense_id = EXCLUDED.expense_id,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount,
    date = EXCLUDED.date,
    payment_method = EXCLUDED.payment_method,
    vendor_payee = EXCLUDED.vendor_payee,
    reference_number = EXCLUDED.reference_number,
    created_by = EXCLUDED.created_by,
    notes = EXCLUDED.notes,
    status = 'Paid',
    payroll_id = EXCLUDED.payroll_id,
    updated_at = EXCLUDED.updated_at
  WHERE target.school_id = EXCLUDED.school_id
  RETURNING * INTO v_expense;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant conflict while linking payroll expense' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object('payroll', to_jsonb(v_payroll), 'expense', to_jsonb(v_expense));
END;
$function$;

REVOKE ALL ON FUNCTION public.dugsiga_mark_payroll_paid(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_mark_payroll_paid(text, text) TO service_role;


-- Activate one-time teacher invitation and create the login record atomically.
CREATE OR REPLACE FUNCTION public.dugsiga_activate_teacher_invitation(
  p_invitation_token text,
  p_password_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_teacher public.dugsiga_teachers%ROWTYPE;
  v_user public.dugsiga_users%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_invitation_token IS NULL OR length(p_invitation_token) < 16
     OR p_password_hash IS NULL OR btrim(p_password_hash) = '' THEN
    RAISE EXCEPTION 'Invitation token and password are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_teacher
  FROM public.dugsiga_teachers
  WHERE invitation_token = p_invitation_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already used' USING ERRCODE = 'P0002';
  END IF;

  IF v_teacher.status IS DISTINCT FROM 'INVITED' THEN
    RAISE EXCEPTION 'Invitation is not active' USING ERRCODE = 'P0002';
  END IF;

  IF NULLIF(v_teacher.invitation_expires_at, '') IS NOT NULL
     AND v_teacher.invitation_expires_at::timestamptz < v_now THEN
    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(btrim(v_teacher.email), '') = '' OR COALESCE(btrim(v_teacher.school_id), '') = '' THEN
    RAISE EXCEPTION 'Invited teacher has no email or school assignment' USING ERRCODE = '22023';
  END IF;

  UPDATE public.dugsiga_teachers
  SET status = 'ACTIVE', invitation_token = NULL, activated_at = v_now::text
  WHERE id = v_teacher.id AND school_id = v_teacher.school_id
  RETURNING * INTO v_teacher;

  INSERT INTO public.dugsiga_users AS target (
    email, password, verified, role, school_id, teacher_id, created_at
  )
  VALUES (
    lower(btrim(v_teacher.email)), p_password_hash, true, 'teacher',
    v_teacher.school_id, v_teacher.id, v_now::timestamp
  )
  ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    verified = true,
    role = 'teacher',
    school_id = EXCLUDED.school_id,
    teacher_id = EXCLUDED.teacher_id
  WHERE target.school_id = EXCLUDED.school_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher email is already attached to a different school' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'email', v_user.email,
    'school_id', v_user.school_id,
    'teacher_id', v_user.teacher_id,
    'status', v_teacher.status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.dugsiga_activate_teacher_invitation(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_activate_teacher_invitation(text, text) TO service_role;
