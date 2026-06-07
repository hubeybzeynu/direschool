import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getOrCreateTelegramLink, checkTelegramLink } from "@/lib/telegram.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Check, Copy, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/connect-telegram")({
  head: () => ({ meta: [{ title: "Connect Telegram — Dire Dawa Schools" }] }),
  component: ConnectTg,
});

const BOT_USERNAME = "drschoolhubbot";

function ConnectTg() {
  const navigate = useNavigate();
  const create = useServerFn(getOrCreateTelegramLink);
  const check = useServerFn(checkTelegramLink);
  const [copied, setCopied] = useState(false);

  const linkQ = useQuery({
    queryKey: ["tg-create"],
    queryFn: () => create({}),
  });

  const statusQ = useQuery({
    queryKey: ["tg-status"],
    queryFn: () => check({}),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (statusQ.data?.linked) navigate({ to: "/schools" });
  }, [statusQ.data?.linked, navigate]);

  const code = linkQ.data?.link?.link_code;
  const startCmd = code ? `/start ${code}` : "";
  const botUrl = code ? `https://t.me/${BOT_USERNAME}?start=${code}` : `https://t.me/${BOT_USERNAME}`;

  async function copy() {
    if (!startCmd) return;
    await navigator.clipboard.writeText(startCmd);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 1500);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--gradient-bg)" }}>
      <Card className="w-full max-w-lg p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Connect Telegram</h1>
              <p className="text-xs text-muted-foreground">Required to access your portal</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <ol className="space-y-3 text-sm">
          <li className="flex gap-3"><span className="font-bold text-primary">1.</span> Open our Telegram bot below.</li>
          <li className="flex gap-3"><span className="font-bold text-primary">2.</span> Send the <code className="px-1.5 py-0.5 rounded bg-muted">/start</code> command (it includes your unique code).</li>
          <li className="flex gap-3"><span className="font-bold text-primary">3.</span> This page will unlock automatically.</li>
        </ol>

        <div className="mt-6 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground mb-2">Your unique start command</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-background border text-xs break-all">{startCmd || "Generating..."}</code>
            <Button variant="outline" size="icon" onClick={copy} disabled={!startCmd}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button asChild className="w-full mt-5" size="lg" disabled={!code}>
          <a href={botUrl} target="_blank" rel="noopener noreferrer">
            <Send className="h-4 w-4 mr-2" /> Open Telegram bot
          </a>
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Waiting for you to connect… {statusQ.isFetching ? "checking" : ""}
        </p>
      </Card>
    </div>
  );
}