-- Atomic persistence for related school finance records.
-- This migration is intentionally staged in Git; apply it to Supabase only after
-- reviewing it and verifying it on a non-production database.

CREATE OR REPLACE FUNCTION public.dugsiga_finance_transaction(
  p_school_id text,
  p_operations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_operation jsonb;
  v_row jsonb;
  v_table text;
  v_action text;
  v_id text;
  v_columns text;
  v_select_columns text;
  v_update_columns text;
  v_affected integer;
  v_total_affected integer := 0;
BEGIN
  IF COALESCE(pg_catalog.btrim(p_school_id), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'school_id_required';
  END IF;

  IF pg_catalog.jsonb_typeof(p_operations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'operations_must_be_array';
  END IF;

  FOR v_operation IN
    SELECT value FROM pg_catalog.jsonb_array_elements(p_operations) AS items(value)
  LOOP
    v_table := v_operation ->> 'table';
    v_action := v_operation ->> 'action';

    IF v_table NOT IN (
      'dugsiga_fee_structures',
      'dugsiga_invoices',
      'dugsiga_fees',
      'dugsiga_payments',
      'dugsiga_expenses',
      'dugsiga_income',
      'dugsiga_payroll',
      'dugsiga_budgets'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'finance_table_not_allowed';
    END IF;

    IF v_action = 'upsert' THEN
      IF pg_catalog.jsonb_typeof(v_operation -> 'rows') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'upsert_rows_must_be_array';
      END IF;

      FOR v_row IN
        SELECT value FROM pg_catalog.jsonb_array_elements(v_operation -> 'rows') AS rows(value)
      LOOP
        IF pg_catalog.jsonb_typeof(v_row) IS DISTINCT FROM 'object'
          OR COALESCE(v_row ->> 'id', '') = ''
          OR v_row ->> 'school_id' IS DISTINCT FROM p_school_id
        THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'finance_row_tenant_or_id_invalid';
        END IF;

        SELECT
          pg_catalog.string_agg(pg_catalog.format('%I', c.column_name), ', ' ORDER BY c.ordinal_position),
          pg_catalog.string_agg(pg_catalog.format('r.%I', c.column_name), ', ' ORDER BY c.ordinal_position),
          pg_catalog.string_agg(
            pg_catalog.format('%1$I = EXCLUDED.%1$I', c.column_name),
            ', ' ORDER BY c.ordinal_position
          ) FILTER (WHERE c.column_name NOT IN ('id', 'school_id'))
        INTO v_columns, v_select_columns, v_update_columns
        FROM information_schema.columns AS c
        WHERE c.table_schema = 'public'
          AND c.table_name = v_table
          AND c.column_name = ANY (ARRAY(SELECT pg_catalog.jsonb_object_keys(v_row)));

        IF v_columns IS NULL
          OR NOT (v_row ? 'id')
          OR NOT (v_row ? 'school_id')
          OR v_update_columns IS NULL
        THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'finance_row_columns_invalid';
        END IF;

        EXECUTE pg_catalog.format(
          'INSERT INTO public.%I AS existing (%s)
           SELECT %s FROM pg_catalog.jsonb_populate_record(NULL::public.%I, $1) AS r
           ON CONFLICT (id) DO UPDATE SET %s
           WHERE existing.school_id = $2 AND EXCLUDED.school_id = $2',
          v_table,
          v_columns,
          v_select_columns,
          v_table,
          v_update_columns
        )
        USING v_row, p_school_id;

        GET DIAGNOSTICS v_affected = ROW_COUNT;
        IF v_affected <> 1 THEN
          RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'finance_row_conflict_or_tenant_mismatch';
        END IF;
        v_total_affected := v_total_affected + v_affected;
      END LOOP;

    ELSIF v_action = 'delete' THEN
      IF pg_catalog.jsonb_typeof(v_operation -> 'ids') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'delete_ids_must_be_array';
      END IF;

      FOR v_id IN
        SELECT pg_catalog.jsonb_array_elements_text(v_operation -> 'ids')
      LOOP
        EXECUTE pg_catalog.format(
          'DELETE FROM public.%I WHERE id = $1 AND school_id = $2',
          v_table
        )
        USING v_id, p_school_id;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        v_total_affected := v_total_affected + v_affected;
      END LOOP;

    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'finance_action_not_allowed';
    END IF;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object('success', true, 'affected_rows', v_total_affected);
END;
$function$;

-- Payment recording is a single database transaction. The invoice row lock
-- prevents concurrent payments from overwriting one another's totals.
CREATE OR REPLACE FUNCTION public.dugsiga_record_invoice_payment(
  p_school_id text,
  p_invoice_id text,
  p_payment jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_invoice public.dugsiga_invoices%ROWTYPE;
  v_payment public.dugsiga_payments%ROWTYPE;
  v_fee public.dugsiga_fees%ROWTYPE;
  v_amount numeric;
  v_new_paid numeric;
  v_new_balance numeric;
  v_new_status text;
  v_updated_at text;
  v_has_fee boolean := false;
BEGIN
  IF COALESCE(pg_catalog.btrim(p_school_id), '') = ''
    OR COALESCE(pg_catalog.btrim(p_invoice_id), '') = ''
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'school_and_invoice_required';
  END IF;

  IF pg_catalog.jsonb_typeof(p_payment) IS DISTINCT FROM 'object'
    OR p_payment ->> 'school_id' IS DISTINCT FROM p_school_id
    OR COALESCE(p_payment ->> 'id', '') = ''
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'payment_payload_invalid';
  END IF;

  v_amount := (p_payment ->> 'amount')::numeric;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'payment_amount_must_be_positive';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.dugsiga_invoices
  WHERE id = p_invoice_id AND school_id = p_school_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'invoice_not_found';
  END IF;

  v_new_paid := COALESCE(v_invoice.paid_amount, 0) + v_amount;
  v_new_balance := GREATEST(0, COALESCE(v_invoice.total, 0) - v_new_paid);
  v_new_status := CASE
    WHEN v_new_balance = 0 THEN 'Paid'
    WHEN v_new_paid > 0 THEN 'Partially Paid'
    ELSE 'Unpaid'
  END;
  v_updated_at := COALESCE(p_payment ->> 'created_at', pg_catalog.now()::text);

  UPDATE public.dugsiga_invoices
  SET paid_amount = v_new_paid,
      balance = v_new_balance,
      status = v_new_status,
      updated_at = v_updated_at
  WHERE id = p_invoice_id AND school_id = p_school_id
  RETURNING * INTO v_invoice;

  INSERT INTO public.dugsiga_payments (
    id, school_id, receipt_number, invoice_id, invoice_number, student_id,
    student_name, class_name, amount, payment_date, payment_method,
    reference, remaining_balance, received_by, notes, created_at
  ) VALUES (
    p_payment ->> 'id',
    p_school_id,
    p_payment ->> 'receipt_number',
    v_invoice.id,
    v_invoice.invoice_number,
    v_invoice.student_id,
    v_invoice.student_name,
    v_invoice.class_name,
    v_amount,
    COALESCE(p_payment ->> 'payment_date', CURRENT_DATE::text),
    COALESCE(p_payment ->> 'payment_method', 'Cash'),
    p_payment ->> 'reference',
    v_new_balance,
    COALESCE(p_payment ->> 'received_by', 'Xisaabiyaha'),
    p_payment ->> 'notes',
    v_updated_at
  )
  RETURNING * INTO v_payment;

  UPDATE public.dugsiga_fees
  SET paid_amount = v_new_paid,
      status = pg_catalog.lower(v_new_status),
      updated_at = v_updated_at
  WHERE id = p_invoice_id AND school_id = p_school_id
  RETURNING * INTO v_fee;
  v_has_fee := FOUND;

  RETURN pg_catalog.jsonb_build_object(
    'invoice', pg_catalog.to_jsonb(v_invoice),
    'payment', pg_catalog.to_jsonb(v_payment),
    'fee', CASE WHEN v_has_fee THEN pg_catalog.to_jsonb(v_fee) ELSE 'null'::jsonb END
  );
END;
$function$;

-- These RPCs are intentionally callable only by the trusted server's service key.
REVOKE ALL ON FUNCTION public.dugsiga_finance_transaction(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dugsiga_finance_transaction(text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_finance_transaction(text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.dugsiga_record_invoice_payment(text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dugsiga_record_invoice_payment(text, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_record_invoice_payment(text, text, jsonb) TO service_role;
