import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Database credentials missing inside .env!");
}

export const supabase = createClient(
  supabaseUrl || 'https://bfwirgutprmkzvpasolr.supabase.co',
  supabaseAnonKey || 'sb_publishable_JiDFOE7U8rjbCDavsi0QqQ_KUKGHjAt'
);
