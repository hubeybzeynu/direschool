#!/bin/bash
echo "=== Decoupling Portal Workspace ==="

# 1. Create clean workspace directories
mkdir -p src/integrations/supabase
mkdir -p src/hooks
mkdir -p src/lib

# 2. Write direct Supabase client config
cat << 'CLIENT_EOF' > src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Database credentials missing inside .env!");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon'
);
CLIENT_EOF

# 3. Write clean user session hook
cat << 'AUTH_EOF' > src/hooks/use-auth.ts
import { useEffect, useState } from 'react';
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
AUTH_EOF

# 4. Write telemetry override files
cat << 'ERR_EOF' > src/lib/lovable-error-reporting.ts
export const reportError = (error: any, context?: any) => {
  console.error("[Local Log] Exception:", error, context);
};

export const initializeTelemetry = () => {
  console.log("[Direct Protocol] Telemetry bypassed.");
};
ERR_EOF

cat << 'GATEWAY_EOF' > src/lib/ai-gateway.server.ts
export const handleGatewayQuery = async (query: string) => {
  return { success: true, mode: "offline-direct" };
};
GATEWAY_EOF

cat << 'MGR_EOF' > src/lib/manager-client.ts
export const syncManagerState = async () => {
  return true;
};
MGR_EOF

# 5. Build template .env configuration
if [ ! -f ".env" ]; then
  cat << 'ENV_EOF' > .env
VITE_SUPABASE_URL=https://your-own-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here
PORT=5173
VITE_API_URL=http://localhost:3000
ENV_EOF
  echo "✔ Template .env initialized."
fi

# 6. Delete old telemetry files
rm -rf .lovable/
rm -rf src/integrations/lovable/

echo "Re-linking local bundle dependencies..."
bun install || npm install

echo "=== Portal Clean Up Done ==="
