
CREATE SEQUENCE IF NOT EXISTS public.dugsiga_users_id_seq;

SELECT setval(
  'public.dugsiga_users_id_seq',
  COALESCE((SELECT MAX(id) FROM public.dugsiga_users), 0) + 1,
  false
);

UPDATE public.dugsiga_users
SET id = nextval('public.dugsiga_users_id_seq')
WHERE id IS NULL;

ALTER TABLE public.dugsiga_users
  ALTER COLUMN id SET DEFAULT nextval('public.dugsiga_users_id_seq');

ALTER TABLE public.dugsiga_users
  ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_users_id
  ON public.dugsiga_users(id);

CREATE INDEX IF NOT EXISTS idx_dugsiga_users_school_id
  ON public.dugsiga_users(school_id);

CREATE INDEX IF NOT EXISTS idx_dugsiga_users_role
  ON public.dugsiga_users(role);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_students_school_roll
  ON public.dugsiga_students (school_id, lower(btrim(roll_number)))
  WHERE roll_number IS NOT NULL AND btrim(roll_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_subjects_school_code
  ON public.dugsiga_subjects (school_id, lower(btrim(subject_code)))
  WHERE subject_code IS NOT NULL AND btrim(subject_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_staff_school_employee
  ON public.dugsiga_staff (school_id, lower(btrim(employee_id)))
  WHERE employee_id IS NOT NULL AND btrim(employee_id) <> '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_classes_capacity_positive') THEN
    ALTER TABLE public.dugsiga_classes
      ADD CONSTRAINT dugsiga_classes_capacity_positive CHECK (capacity IS NULL OR capacity > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_subjects_marks_valid') THEN
    ALTER TABLE public.dugsiga_subjects
      ADD CONSTRAINT dugsiga_subjects_marks_valid CHECK (
        (pass_marks IS NULL OR pass_marks >= 0) AND
        (max_marks IS NULL OR max_marks > 0) AND
        (pass_marks IS NULL OR max_marks IS NULL OR pass_marks <= max_marks)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_exam_scores_marks_valid') THEN
    ALTER TABLE public.dugsiga_exam_scores
      ADD CONSTRAINT dugsiga_exam_scores_marks_valid CHECK (
        marks_obtained >= 0 AND
        max_marks IS NOT NULL AND
        max_marks > 0 AND
        marks_obtained <= max_marks
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_fees_amounts_nonnegative') THEN
    ALTER TABLE public.dugsiga_fees
      ADD CONSTRAINT dugsiga_fees_amounts_nonnegative CHECK (amount >= 0 AND paid_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_invoices_amounts_nonnegative') THEN
    ALTER TABLE public.dugsiga_invoices
      ADD CONSTRAINT dugsiga_invoices_amounts_nonnegative CHECK (
        subtotal >= 0 AND discount >= 0 AND total >= 0 AND paid_amount >= 0 AND balance >= 0
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_payments_amount_nonnegative') THEN
    ALTER TABLE public.dugsiga_payments
      ADD CONSTRAINT dugsiga_payments_amount_nonnegative CHECK (
        amount >= 0 AND (remaining_balance IS NULL OR remaining_balance >= 0)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_expenses_amount_nonnegative') THEN
    ALTER TABLE public.dugsiga_expenses
      ADD CONSTRAINT dugsiga_expenses_amount_nonnegative CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_income_amount_nonnegative') THEN
    ALTER TABLE public.dugsiga_income
      ADD CONSTRAINT dugsiga_income_amount_nonnegative CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_budgets_amounts_nonnegative') THEN
    ALTER TABLE public.dugsiga_budgets
      ADD CONSTRAINT dugsiga_budgets_amounts_nonnegative CHECK (
        planned_amount >= 0 AND actual_amount >= 0 AND remaining_amount >= 0
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_payroll_amounts_nonnegative') THEN
    ALTER TABLE public.dugsiga_payroll
      ADD CONSTRAINT dugsiga_payroll_amounts_nonnegative CHECK (
        basic_salary >= 0 AND allowances >= 0 AND deductions >= 0 AND
        gross_salary >= 0 AND net_salary >= 0
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dugsiga_library_copies_valid') THEN
    ALTER TABLE public.dugsiga_library_books
      ADD CONSTRAINT dugsiga_library_copies_valid CHECK (
        total_copies >= 0 AND available_copies >= 0 AND available_copies <= total_copies
      );
  END IF;
END $$;
