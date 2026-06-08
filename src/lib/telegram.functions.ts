import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "tg_" + Array.from(bytes).map(b => b.toString(36)).join("").slice(0, 14);
}

export const getOrCreateTelegramLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any).email ?? null;
    const name = (claims as any).user_metadata?.full_name ?? (claims as any).name ?? null;

    const { data: existing } = await supabase
      .from("telegram_links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.linked) {
      return { link: existing, botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null };
    }
    if (existing && !existing.linked) {
      return { link: existing, botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null };
    }

    const code = randomCode();
    const { data, error } = await supabase
      .from("telegram_links")
      .insert({ user_id: userId, user_email: email, user_name: name, link_code: code })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { link: data, botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null };
  });

export const checkTelegramLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("telegram_links")
      .select("*")
      .eq("user_id", userId)
      .eq("linked", true)
      .order("linked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { linked: !!data, link: data };
  });

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any).email ?? null;
    const name = (claims as any).user_metadata?.full_name ?? (claims as any).name ?? null;
    await supabase.from("login_events").insert({ user_id: userId, user_email: email, user_name: name });
    // Notify admin via Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      const adminChat = 6218343992;
      const text = `🔐 New portal login\nEmail: <b>${email ?? "(none)"}</b>\nName: ${name ?? "-"}\nTime: ${new Date().toISOString()}`;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: adminChat, text, parse_mode: "HTML" }),
      }).catch(() => {});
    }
    return { ok: true };
  });

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, claims } = context;
    const email = (claims as any).email as string | undefined;
    const { data: admin } = await supabase.from("portal_admins").select("email").eq("email", email ?? "").maybeSingle();
    if (!admin) throw new Error("Forbidden: admins only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: logins }, { data: links }] = await Promise.all([
      supabaseAdmin.from("login_events").select("*").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("telegram_links").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    return { logins: logins ?? [], links: links ?? [] };
  });