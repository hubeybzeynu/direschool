import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { getSchoolById } from "@/lib/schools";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  GraduationCap,
  LogOut,
  Users,
  ClipboardList,
  Trophy,
  CalendarCheck2,
  BookOpen,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/school/$schoolId")({
  loader: ({ params }) => {
    const school = getSchoolById(params.schoolId);
    if (!school) throw notFound();
    return { school };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.school.name ?? "School"} — Dashboard` },
      { name: "description", content: `Manage ${loaderData?.school.name ?? "this school"} in Dire Dawa.` },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">School not found</h1>
        <Link to="/schools" className="text-primary hover:underline mt-2 inline-block">Back to schools</Link>
      </div>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <Button className="mt-4" onClick={reset}>Try again</Button>
      </div>
    </div>
  ),
  component: SchoolPage,
});

const SECTIONS = [
  { key: "students", title: "Students", desc: "Roster of enrolled students.", icon: Users },
  { key: "mid-results", title: "Mid Results", desc: "Mid-term grades and reports.", icon: ClipboardList },
  { key: "final-results", title: "Final Results", desc: "End-of-term final grades.", icon: Trophy },
  { key: "attendance", title: "Attendance", desc: "Daily attendance records.", icon: CalendarCheck2 },
  { key: "subjects", title: "Subjects", desc: "Subjects taught at the school.", icon: BookOpen },
  { key: "announcements", title: "Announcements", desc: "News and notices for the school.", icon: Megaphone },
] as const;

function SchoolPage() {
  const { school } = Route.useLoaderData();
  const navigate = useNavigate();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/schools" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All schools
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dire Dawa</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{school.name}</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Card key={s.key} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">{s.title}</h2>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <div className="mt-5 rounded-md border border-dashed p-6 text-center">
                <p className="text-sm font-medium text-foreground">No data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data for this school will be added later.
                </p>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}