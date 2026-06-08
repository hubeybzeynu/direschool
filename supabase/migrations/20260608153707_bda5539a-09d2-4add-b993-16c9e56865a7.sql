
-- mid_results
CREATE TABLE public.mid_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  subject text,
  grade_group text,
  result_image_url text NOT NULL,
  answer_image_url text,
  student_name text,
  student_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mid_results TO anon, authenticated;
GRANT ALL ON public.mid_results TO service_role;
ALTER TABLE public.mid_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read mid_results" ON public.mid_results FOR SELECT USING (true);
CREATE INDEX mid_results_student_id_idx ON public.mid_results(student_id);

-- final_results
CREATE TABLE public.final_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  subject text,
  grade_group text,
  result_image_url text NOT NULL,
  answer_image_url text,
  student_name text,
  student_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.final_results TO anon, authenticated;
GRANT ALL ON public.final_results TO service_role;
ALTER TABLE public.final_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read final_results" ON public.final_results FOR SELECT USING (true);
CREATE INDEX final_results_student_id_idx ON public.final_results(student_id);

-- report_cards
CREATE TABLE public.report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  student_name text,
  sex text,
  age integer,
  kebele text,
  house_no text,
  teacher_name text,
  school_year text,
  grade text,
  subjects jsonb NOT NULL DEFAULT '{}'::jsonb,
  conduct jsonb NOT NULL DEFAULT '{}'::jsonb,
  days_present jsonb NOT NULL DEFAULT '{}'::jsonb,
  days_absent jsonb NOT NULL DEFAULT '{}'::jsonb,
  times_tardy jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_academic_days jsonb NOT NULL DEFAULT '{}'::jsonb,
  rank jsonb NOT NULL DEFAULT '{}'::jsonb,
  remarks text,
  promoted_to text,
  detained_in_grade text,
  card_password text,
  total_students integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.report_cards TO anon, authenticated;
GRANT ALL ON public.report_cards TO service_role;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read report_cards" ON public.report_cards FOR SELECT USING (true);
CREATE INDEX report_cards_student_id_idx ON public.report_cards(student_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER mid_results_set_updated BEFORE UPDATE ON public.mid_results
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER final_results_set_updated BEFORE UPDATE ON public.final_results
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER report_cards_set_updated BEFORE UPDATE ON public.report_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mid_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.final_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_cards;
