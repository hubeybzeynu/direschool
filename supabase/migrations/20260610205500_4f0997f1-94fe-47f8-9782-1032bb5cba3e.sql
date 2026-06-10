
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['final_results','mid_results','ministry_results','report_cards','schools','students'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Open write %s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Open write %s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
