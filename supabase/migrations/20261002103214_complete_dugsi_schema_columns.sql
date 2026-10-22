
ALTER TABLE public.dugsiga_students ADD COLUMN IF NOT EXISTS guardian_relationship TEXT;
ALTER TABLE public.dugsiga_students ADD COLUMN IF NOT EXISTS guardian_phone_alt TEXT;

ALTER TABLE public.dugsiga_classes ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.dugsiga_classes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 30;
ALTER TABLE public.dugsiga_classes ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2026-2027';
ALTER TABLE public.dugsiga_classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.dugsiga_subjects ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.dugsiga_subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.dugsiga_subjects ADD COLUMN IF NOT EXISTS pass_marks NUMERIC DEFAULT 50;
ALTER TABLE public.dugsiga_subjects ADD COLUMN IF NOT EXISTS max_marks NUMERIC DEFAULT 100;
ALTER TABLE public.dugsiga_subjects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.dugsiga_teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.dugsiga_teachers ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE public.dugsiga_teachers ADD COLUMN IF NOT EXISTS invitation_expires_at TEXT;
ALTER TABLE public.dugsiga_teachers ADD COLUMN IF NOT EXISTS invitation_sent_at TEXT;
ALTER TABLE public.dugsiga_teachers ADD COLUMN IF NOT EXISTS activated_at TEXT;
