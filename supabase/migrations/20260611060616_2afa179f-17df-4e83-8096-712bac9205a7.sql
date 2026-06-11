
-- =========================================================
-- 1. Roles infrastructure
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager'))
$$;

-- =========================================================
-- 2. Auto-grant admin to hubeybzeynu@gmail.com
-- =========================================================
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'hubeybzeynu@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS grant_owner_admin_on_signup ON auth.users;
CREATE TRIGGER grant_owner_admin_on_signup
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

-- Seed now if account already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'hubeybzeynu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =========================================================
-- 3. Drop old open policies
-- =========================================================
DROP POLICY IF EXISTS "Open write final_results" ON public.final_results;
DROP POLICY IF EXISTS "Public read final_results" ON public.final_results;
DROP POLICY IF EXISTS "Open write mid_results" ON public.mid_results;
DROP POLICY IF EXISTS "Public read mid_results" ON public.mid_results;
DROP POLICY IF EXISTS "Open write ministry_results" ON public.ministry_results;
DROP POLICY IF EXISTS "Public read ministry_results" ON public.ministry_results;
DROP POLICY IF EXISTS "Open write report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Public read report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Open write schools" ON public.schools;
DROP POLICY IF EXISTS "Public read schools" ON public.schools;
DROP POLICY IF EXISTS "Open write students" ON public.students;
DROP POLICY IF EXISTS "Public read students" ON public.students;
DROP POLICY IF EXISTS "auth read admins" ON public.portal_admins;

-- =========================================================
-- 4. New role-scoped policies
-- =========================================================
-- schools: public catalog read, staff writes
CREATE POLICY "schools public read" ON public.schools FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "schools staff write" ON public.schools FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ministry_results: public catalog read, staff writes
CREATE POLICY "ministry public read" ON public.ministry_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ministry staff write" ON public.ministry_results FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- students: staff only (PII)
CREATE POLICY "students staff read" ON public.students FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "students staff write" ON public.students FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- report_cards: staff only direct access; public uses RPC
CREATE POLICY "report_cards staff read" ON public.report_cards FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "report_cards staff write" ON public.report_cards FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- mid_results / final_results: staff only direct access; public uses RPC
CREATE POLICY "mid staff read" ON public.mid_results FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "mid staff write" ON public.mid_results FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "final staff read" ON public.final_results FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "final staff write" ON public.final_results FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- portal_admins: scope to own email
CREATE POLICY "portal_admins own row" ON public.portal_admins FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

-- Revoke anon table privileges on locked tables; keep service_role
REVOKE ALL ON public.students, public.report_cards, public.mid_results, public.final_results FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students, public.report_cards, public.mid_results, public.final_results TO authenticated;
GRANT ALL ON public.students, public.report_cards, public.mid_results, public.final_results TO service_role;

GRANT SELECT ON public.schools, public.ministry_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools, public.ministry_results TO authenticated;
GRANT ALL ON public.schools, public.ministry_results TO service_role;

-- =========================================================
-- 5. Public password-gated RPCs (no PII without correct password)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_report_card_by_password(p_student_id text, p_password text)
RETURNS TABLE (
  id uuid, student_id text, student_name text, sex text, age integer,
  kebele text, house_no text, teacher_name text, school_year text, grade text,
  subjects jsonb, conduct jsonb, days_present jsonb, days_absent jsonb,
  times_tardy jsonb, total_academic_days jsonb, rank jsonb, remarks text,
  promoted_to text, detained_in_grade text, total_students integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, student_id, student_name, sex, age, kebele, house_no, teacher_name,
         school_year, grade, subjects, conduct, days_present, days_absent,
         times_tardy, total_academic_days, rank, remarks, promoted_to,
         detained_in_grade, total_students
  FROM public.report_cards
  WHERE student_id = p_student_id
    AND card_password IS NOT NULL AND card_password <> ''
    AND card_password = p_password
$$;

CREATE OR REPLACE FUNCTION public.get_mid_result_by_password(p_student_id text, p_password text)
RETURNS TABLE (id uuid, student_id text, subject text, grade_group text,
  result_image_url text, answer_image_url text, student_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, student_id, subject, grade_group, result_image_url, answer_image_url, student_name
  FROM public.mid_results
  WHERE student_id = p_student_id
    AND student_password IS NOT NULL AND student_password <> ''
    AND student_password = p_password
$$;

CREATE OR REPLACE FUNCTION public.get_final_result_by_password(p_student_id text, p_password text)
RETURNS TABLE (id uuid, student_id text, subject text, grade_group text,
  result_image_url text, answer_image_url text, student_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, student_id, subject, grade_group, result_image_url, answer_image_url, student_name
  FROM public.final_results
  WHERE student_id = p_student_id
    AND student_password IS NOT NULL AND student_password <> ''
    AND student_password = p_password
$$;

GRANT EXECUTE ON FUNCTION public.get_report_card_by_password(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mid_result_by_password(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_final_result_by_password(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated;

-- =========================================================
-- 6. Remove sensitive tables from realtime publication
-- =========================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.report_cards;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.mid_results;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.final_results;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.students;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.portal_admins;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
