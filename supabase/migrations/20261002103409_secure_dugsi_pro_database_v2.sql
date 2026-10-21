
DROP POLICY IF EXISTS "anyone can insert" ON public.dugsiga_users;

REVOKE ALL PRIVILEGES ON TABLE public.dugsiga_users,
  public.dugsiga_students,
  public.dugsiga_classes,
  public.dugsiga_subjects,
  public.dugsiga_exam_scores,
  public.dugsiga_attendance,
  public.dugsiga_fees,
  public.dugsiga_settings,
  public.dugsiga_teachers,
  public.dugsiga_staff,
  public.dugsiga_guardians,
  public.dugsiga_staff_attendance,
  public.dugsiga_timetable,
  public.dugsiga_admissions,
  public.dugsiga_announcements,
  public.dugsiga_library_books,
  public.dugsiga_library_loans,
  public.dugsiga_inventory,
  public.dugsiga_documents,
  public.dugsiga_notifications,
  public.dugsiga_fee_structures,
  public.dugsiga_invoices,
  public.dugsiga_payments,
  public.dugsiga_expenses,
  public.dugsiga_income,
  public.dugsiga_budgets,
  public.dugsiga_payroll
FROM anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.dugsiga_users,
  public.dugsiga_students,
  public.dugsiga_classes,
  public.dugsiga_subjects,
  public.dugsiga_exam_scores,
  public.dugsiga_attendance,
  public.dugsiga_fees,
  public.dugsiga_settings,
  public.dugsiga_teachers,
  public.dugsiga_staff,
  public.dugsiga_guardians,
  public.dugsiga_staff_attendance,
  public.dugsiga_timetable,
  public.dugsiga_admissions,
  public.dugsiga_announcements,
  public.dugsiga_library_books,
  public.dugsiga_library_loans,
  public.dugsiga_inventory,
  public.dugsiga_documents,
  public.dugsiga_notifications,
  public.dugsiga_fee_structures,
  public.dugsiga_invoices,
  public.dugsiga_payments,
  public.dugsiga_expenses,
  public.dugsiga_income,
  public.dugsiga_budgets,
  public.dugsiga_payroll
TO service_role;

ALTER TABLE public.dugsiga_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_library_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dugsiga_payroll ENABLE ROW LEVEL SECURITY;
