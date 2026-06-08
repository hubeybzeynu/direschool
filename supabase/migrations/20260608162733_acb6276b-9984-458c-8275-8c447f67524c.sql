
CREATE TABLE public.schools (
  id text PRIMARY KEY,
  name text NOT NULL,
  rating numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO anon, authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read schools" ON public.schools FOR SELECT USING (true);
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.students (
  id integer PRIMARY KEY,
  school_id text NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  english_name text,
  age integer,
  gender text,
  section text,
  image_url text,
  download_url text,
  telegram text,
  instagram text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX students_school_idx ON public.students(school_id);
GRANT SELECT ON public.students TO anon, authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read students" ON public.students FOR SELECT USING (true);
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ministry_results (
  registration_no text PRIMARY KEY,
  school_id text REFERENCES public.schools(id) ON DELETE SET NULL,
  result_image_url text NOT NULL,
  download_url text,
  student_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ministry_results_school_idx ON public.ministry_results(school_id);
GRANT SELECT ON public.ministry_results TO anon, authenticated;
GRANT ALL ON public.ministry_results TO service_role;
ALTER TABLE public.ministry_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ministry_results" ON public.ministry_results FOR SELECT USING (true);
CREATE TRIGGER ministry_results_updated_at BEFORE UPDATE ON public.ministry_results FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ministry_results;
