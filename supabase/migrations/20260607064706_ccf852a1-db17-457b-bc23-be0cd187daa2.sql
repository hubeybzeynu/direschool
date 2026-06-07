
-- Telegram linking + login tracking + admin allowlist

CREATE TABLE public.telegram_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  user_name text,
  link_code text NOT NULL UNIQUE,
  telegram_chat_id bigint,
  telegram_username text,
  telegram_first_name text,
  linked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  linked_at timestamptz
);
CREATE INDEX idx_tg_links_user ON public.telegram_links(user_id);
CREATE INDEX idx_tg_links_code ON public.telegram_links(link_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_links TO authenticated;
GRANT ALL ON public.telegram_links TO service_role;

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own links" ON public.telegram_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own links" ON public.telegram_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_user ON public.login_events(user_id);

GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own login" ON public.login_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users read own login" ON public.login_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.portal_admins (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portal_admins TO authenticated;
GRANT ALL ON public.portal_admins TO service_role;
ALTER TABLE public.portal_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read admins" ON public.portal_admins FOR SELECT TO authenticated USING (true);

INSERT INTO public.portal_admins(email) VALUES ('hubeybzeynu@gmail.com') ON CONFLICT DO NOTHING;
