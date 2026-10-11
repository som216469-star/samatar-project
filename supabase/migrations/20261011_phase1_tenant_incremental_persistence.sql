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

    IF v_table NOT IN (
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

    IF v_operation NOT IN ('upsert', 'delete') THEN
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
        WHERE a.attname NOT IN (
          SELECT trim(both '"' from x)
          FROM unnest(string_to_array(v_primary_key, ',')) AS x
        )
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

    EXECUTE v_sql USING v_row INTO v_affected;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tenant conflict while saving row to %', v_table
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.dugsiga_apply_tenant_changes(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dugsiga_apply_tenant_changes(text, jsonb) TO service_role;
