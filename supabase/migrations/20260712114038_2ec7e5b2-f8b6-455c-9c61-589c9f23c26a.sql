CREATE TABLE public.telegram_bot_state (
  chat_id BIGINT PRIMARY KEY,
  awaiting TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_bot_state TO service_role;
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public.telegram_bot_state FOR ALL USING (false) WITH CHECK (false);