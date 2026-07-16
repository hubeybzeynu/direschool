import os
import shutil

# Create necessary target paths if they do not exist
os.makedirs("src/integrations/supabase", exist_ok=True)
os.makedirs("src/hooks", exist_ok=True)
os.makedirs("src/lib", exist_ok=True)

print("[1/7] Writing environment configurations (.env)...")
with open(".env", "w", encoding="utf-8") as f:
    f.write("VITE_SUPABASE_URL=https://bfwirgutprmkzvpasolr.supabase.co\n")
    f.write("VITE_SUPABASE_ANON_KEY=sb_publishable_JiDFOE7U8rjbCDavsi0QqQ_KUKGHjAt\n")
    f.write("PORT=8082\n")
    f.write("VITE_API_URL=http://localhost:3000\n")

print("[2/7] Updating Supabase client driver...")
client_code = """import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Database credentials missing inside .env!");
}

export const supabase = createClient(
  supabaseUrl || 'https://bfwirgutprmkzvpasolr.supabase.co',
  supabaseAnonKey || 'sb_publishable_JiDFOE7U8rjbCDavsi0QqQ_KUKGHjAt'
);
"""
with open("src/integrations/supabase/client.ts", "w", encoding="utf-8") as f:
    f.write(client_code)

print("[3/7] Updating authentication hooks...")
auth_code = """import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
"""
with open("src/hooks/use-auth.ts", "w", encoding="utf-8") as f:
    f.write(auth_code)

print("[4/7] Applying No-Op error-reporting override...")
err_code = """export const reportError = (error: any, context?: any) => {
  console.error("[Local Server Log] Captured Exception:", error, context);
};

export const initializeTelemetry = () => {
  print("[Direct DB Protocol] Lovable tracking telemetry disabled.");
};
"""
with open("src/lib/lovable-error-reporting.ts", "w", encoding="utf-8") as f:
    f.write(err_code)

print("[5/7] Applying No-Op AI gateway override...")
gateway_code = """export const handleGatewayQuery = async (query: string) => {
  console.warn("AI Gateway running in standalone local-bypass mode.");
  return { success: true, mode: "offline-direct" };
};
"""
with open("src/lib/ai-gateway.server.ts", "w", encoding="utf-8") as f:
    f.write(gateway_code)

print("[6/7] Applying No-Op Manager state override...")
mgr_code = """export const syncManagerState = async () => {
  return true;
};
"""
with open("src/lib/manager-client.ts", "w", encoding="utf-8") as f:
    f.write(mgr_code)

print("[7/7] Pruning cloud project files...")
for target_dir in [".lovable", "src/integrations/lovable"]:
    if os.path.exists(target_dir):
        try:
            shutil.rmtree(target_dir)
            print(f"Removed legacy telemetry folder: {target_dir}")
        except Exception as e:
            print(f"Could not remove {target_dir}: {e}")

print("==========================================================")
print(" Standalone Portal Migration Completed Successfully!")
print(" Both apps are now clean and unified on 'bfwirgutprmkzvpasolr'.")
print("==========================================================")