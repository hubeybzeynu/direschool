import { createFileRoute } from "@tanstack/react-router";

const TG_API = "https://api.telegram.org";

async function sendMessage(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let update: any;
        try { update = await request.json(); } catch { return new Response("bad", { status: 400 }); }

        const msg = update.message ?? update.edited_message;
        if (!msg?.chat?.id) return Response.json({ ok: true });

        const chatId = msg.chat.id as number;
        const text: string = (msg.text ?? "").trim();
        const username: string | undefined = msg.from?.username;
        const firstName: string | undefined = msg.from?.first_name;

        // /start <code>
        const startMatch = text.match(/^\/start(?:\s+(\S+))?/);
        if (!startMatch) {
          await sendMessage(chatId, "Welcome! Open the portal and copy your link command, then send it here as /start &lt;code&gt;.");
          return Response.json({ ok: true });
        }

        const code = startMatch[1];
        if (!code) {
          await sendMessage(chatId, "👋 Send <code>/start YOUR_CODE</code> from the portal to connect your account.");
          return Response.json({ ok: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("telegram_links")
          .select("*")
          .eq("link_code", code)
          .maybeSingle();

        if (!row) {
          await sendMessage(chatId, "❌ That code is invalid or expired. Try again from the portal.");
          return Response.json({ ok: true });
        }
        if (row.linked) {
          await sendMessage(chatId, "✅ This portal account is already linked. You can return to the website.");
          return Response.json({ ok: true });
        }

        await supabaseAdmin
          .from("telegram_links")
          .update({
            linked: true,
            telegram_chat_id: chatId,
            telegram_username: username ?? null,
            telegram_first_name: firstName ?? null,
            linked_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        await sendMessage(
          chatId,
          `✅ Linked successfully!\n\nEmail: <b>${row.user_email ?? "(none)"}</b>\n\nYou can now return to the portal.`,
        );

        // Notify admin (owner)
        const adminChat = 6218343992;
        await sendMessage(
          adminChat,
          `🔔 New Telegram link\nUser: <b>${row.user_email ?? "(no email)"}</b>\nName: ${row.user_name ?? "-"}\nTelegram: @${username ?? "-"} (chat ${chatId})`,
        );

        return Response.json({ ok: true });
      },
      GET: async () => new Response("ok"),
    },
  },
});