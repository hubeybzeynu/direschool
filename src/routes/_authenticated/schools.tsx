import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSchools } from "@/lib/manager-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, LogOut, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { checkTelegramLink, recordLogin } from "@/lib/telegram.functions";

export const Route = createFileRoute("/_authenticated/schools")({
  head: () => ({
    meta: [
      { title: "Choose your school — Dire Dawa" },
      { name: "description", content: "Pick a Dire Dawa school to manage." },
    ],
  }),
  component: SchoolsPage,
});

function SchoolsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const check = useServerFn(checkTelegramLink);
  const record = useServerFn(recordLogin);

  const linkQ = useQuery({ queryKey: ["tg-status"], queryFn: () => check({}) });
  useEffect(() => {
    if (linkQ.data && !linkQ.data.linked) navigate({ to: "/connect-telegram" });
  }, [linkQ.data, navigate]);

  useEffect(() => {
    record({}).catch(() => {});
  }, [record]);

  const schoolsQ = useQuery({ queryKey: ["manager-schools"], queryFn: fetchSchools });
  const schools = schoolsQ.data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? schools.filter((s) => s.name.toLowerCase().includes(term)) : schools;
  }, [q, schools]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Dire Dawa Schools</p>
              <p className="text-xs text-muted-foreground">Choose a school</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin"><ShieldCheck className="h-4 w-4 mr-1" /> Admin</Link>
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Select your school</h1>
        <p className="text-muted-foreground mt-1">
          {schools.length} schools in Dire Dawa. Pick one to open its dashboard.
        </p>

        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to="/school/$schoolId"
              params={{ schoolId: s.slug }}
              className="group"
            >
              <Card className="p-4 h-full transition-colors hover:border-primary hover:bg-accent/40">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground break-words">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Dire Dawa</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {schoolsQ.isLoading && (
            <p className="text-sm text-muted-foreground col-span-full">Loading schools…</p>
          )}
          {!schoolsQ.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">
              {schools.length === 0 ? "No schools available yet." : "No schools match your search."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}