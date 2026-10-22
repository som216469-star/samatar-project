
UPDATE public.dugsiga_users
SET school_id = lower(btrim(email))
WHERE school_id IS NULL OR btrim(school_id) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_invoices_school_invoice
  ON public.dugsiga_invoices (school_id, invoice_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_payments_school_receipt
  ON public.dugsiga_payments (school_id, receipt_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_teachers_school_email
  ON public.dugsiga_teachers (school_id, lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dugsiga_classes_school_class_section_year
  ON public.dugsiga_classes (school_id, class_name, coalesce(section,''), coalesce(academic_year,''));

CREATE INDEX IF NOT EXISTS idx_dugsiga_students_school_id ON public.dugsiga_students (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_students_school_class ON public.dugsiga_students (school_id, class);
CREATE INDEX IF NOT EXISTS idx_dugsiga_students_school_status ON public.dugsiga_students (school_id, status);

CREATE INDEX IF NOT EXISTS idx_dugsiga_classes_school_id ON public.dugsiga_classes (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_subjects_school_id ON public.dugsiga_subjects (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_exam_scores_school_student ON public.dugsiga_exam_scores (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_attendance_school_date ON public.dugsiga_attendance (school_id, date);
CREATE INDEX IF NOT EXISTS idx_dugsiga_fees_school_student ON public.dugsiga_fees (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_settings_school ON public.dugsiga_settings (school_id);

CREATE INDEX IF NOT EXISTS idx_dugsiga_teachers_school_id ON public.dugsiga_teachers (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_teachers_school_status ON public.dugsiga_teachers (school_id, status);

CREATE INDEX IF NOT EXISTS idx_dugsiga_staff_school_id ON public.dugsiga_staff (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_guardians_school_id ON public.dugsiga_guardians (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_staff_attendance_school_date ON public.dugsiga_staff_attendance (school_id, date);
CREATE INDEX IF NOT EXISTS idx_dugsiga_timetable_school_class ON public.dugsiga_timetable (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_dugsiga_admissions_school_status ON public.dugsiga_admissions (school_id, status);
CREATE INDEX IF NOT EXISTS idx_dugsiga_announcements_school_status ON public.dugsiga_announcements (school_id, status);
CREATE INDEX IF NOT EXISTS idx_dugsiga_library_books_school_id ON public.dugsiga_library_books (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_library_loans_school_borrower ON public.dugsiga_library_loans (school_id, borrower_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_inventory_school_id ON public.dugsiga_inventory (school_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_documents_school_related ON public.dugsiga_documents (school_id, related_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_notifications_school_recipient ON public.dugsiga_notifications (school_id, recipient);
CREATE INDEX IF NOT EXISTS idx_dugsiga_fee_structures_school_year ON public.dugsiga_fee_structures (school_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_dugsiga_invoices_school_student ON public.dugsiga_invoices (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_invoices_school_status ON public.dugsiga_invoices (school_id, status);
CREATE INDEX IF NOT EXISTS idx_dugsiga_payments_school_student ON public.dugsiga_payments (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_dugsiga_payments_school_date ON public.dugsiga_payments (school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_dugsiga_expenses_school_date ON public.dugsiga_expenses (school_id, date);
CREATE INDEX IF NOT EXISTS idx_dugsiga_income_school_date ON public.dugsiga_income (school_id, date);
CREATE INDEX IF NOT EXISTS idx_dugsiga_budgets_school_year ON public.dugsiga_budgets (school_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_dugsiga_payroll_school_period ON public.dugsiga_payroll (school_id, payroll_period);
