import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminData } from "@/lib/telegram.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Dire Dawa Schools" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const fn = useServerFn(getAdminData);
  const q = useQuery({ queryKey: ["admin-data"], queryFn: () => fn({}), retry: false });

  if (q.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <Card className="p-8 max-w-md">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-bold">Admins only</h1>
          <p className="text-sm text-muted-foreground mt-1">You don't have access to this page.</p>
          <Button asChild className="mt-4"><Link to="/schools">Back</Link></Button>
        </Card>
      </div>
    );
  }

  async function logout() { await supabase.auth.signOut(); navigate({ to: "/auth" }); }

  const logins = q.data?.logins ?? [];
  const links = q.data?.links ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/schools" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Schools
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-2" /> Log out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Recent logins & Telegram connections</p>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent logins</h2>
            <Badge variant="secondary">{logins.length}</Badge>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr><th className="text-left p-3">Email</th><th className="text-left p-3">Name</th><th className="text-left p-3">When</th></tr>
              </thead>
              <tbody>
                {logins.map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{l.user_email ?? "—"}</td>
                    <td className="p-3">{l.user_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {logins.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No logins yet</td></tr>}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Telegram links</h2>
            <Badge variant="secondary">{links.filter((l: any) => l.linked).length} linked / {links.length} total</Badge>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Telegram</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Linked At</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{l.user_email ?? "—"}</td>
                    <td className="p-3">{l.user_name ?? "—"}</td>
                    <td className="p-3">{l.telegram_username ? `@${l.telegram_username}` : "—"} {l.telegram_chat_id ? <span className="text-xs text-muted-foreground">({l.telegram_chat_id})</span> : null}</td>
                    <td className="p-3">{l.linked ? <Badge>Linked</Badge> : <Badge variant="outline">Pending</Badge>}</td>
                    <td className="p-3 text-muted-foreground">{l.linked_at ? new Date(l.linked_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {links.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No links yet</td></tr>}
              </tbody>
            </table>
          </Card>
        </section>
      </main>
    </div>
  );
}