
DO $$
DECLARE
  tbl_name TEXT;
  tables_list TEXT[] := ARRAY[
    'dugsiga_users',
    'dugsiga_students',
    'dugsiga_classes',
    'dugsiga_subjects',
    'dugsiga_exam_scores',
    'dugsiga_attendance',
    'dugsiga_fees',
    'dugsiga_settings',
    'dugsiga_teachers',
    'dugsiga_staff',
    'dugsiga_guardians',
    'dugsiga_staff_attendance',
    'dugsiga_timetable',
    'dugsiga_admissions',
    'dugsiga_announcements',
    'dugsiga_library_books',
    'dugsiga_library_loans',
    'dugsiga_inventory',
    'dugsiga_documents',
    'dugsiga_notifications',
    'dugsiga_fee_structures',
    'dugsiga_invoices',
    'dugsiga_payments',
    'dugsiga_expenses',
    'dugsiga_income',
    'dugsiga_budgets',
    'dugsiga_payroll'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_list LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', tbl_name);
    EXECUTE format('DROP POLICY IF EXISTS service_role_only ON public.%I', tbl_name);
    EXECUTE format(
      'CREATE POLICY service_role_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl_name
    );
  END LOOP;
END $$;
