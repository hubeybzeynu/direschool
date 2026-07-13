import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchSchoolBySlug, fetchSections } from "@/lib/manager-client";
import { supabase } from "@/integrations/supabase/client";
import { checkTelegramLink } from "@/lib/telegram.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft, GraduationCap, LogOut, Users, Award, Home, ScrollText, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  HomeSection, StudentsSection, ReportCardSection, MinistrySection, TextbooksSection,
} from "@/components/st-theresa/sections";

export const Route = createFileRoute("/_authenticated/school/$schoolId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.schoolId} — Dire Dawa Schools` },
      { name: "description", content: "School dashboard — students, grades, and report cards." },
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

import type { ReactElement } from "react";
type TabDef = { key: string; title: string; icon: typeof Home; render: () => ReactElement };

function SchoolPage() {
  const { schoolId } = Route.useParams();
  const navigate = useNavigate();
  const [grade, setGrade] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("home");

  const schoolQ = useQuery({
    queryKey: ["manager-school", schoolId],
    queryFn: () => fetchSchoolBySlug(schoolId),
  });
  const school = schoolQ.data;

  const sectionsQ = useQuery({
    queryKey: ["manager-sections", school?.id],
    queryFn: () => fetchSections(school!.id),
    enabled: !!school?.id,
  });
  const allSections = sectionsQ.data ?? [];

  const grades = useMemo(
    () => Array.from(new Set(allSections.map((s) => s.grade))).sort(),
    [allSections],
  );
  const sectionsForGrade = useMemo(
    () => (grade ? Array.from(new Set(allSections.filter((s) => s.grade === grade).map((s) => s.section))).sort() : []),
    [allSections, grade],
  );

  // Auto-pick first grade / section once loaded
  useEffect(() => {
    if (!grade && grades.length) setGrade(grades[0]);
  }, [grades, grade]);
  useEffect(() => {
    if (grade && sectionsForGrade.length && (!section || !sectionsForGrade.includes(section))) {
      setSection(sectionsForGrade[0]);
    }
  }, [grade, sectionsForGrade, section]);

  const isGrade8 = grade === "8";
  const commonTextbooks: TabDef = {
    key: "textbooks", title: "Textbooks", icon: BookOpen,
    render: () => <TextbooksSection grade={grade} />,
  };
  const tabs: TabDef[] = isGrade8
    ? [
        { key: "ministry", title: "Ministry", icon: Award, render: () => <MinistrySection /> },
        commonTextbooks,
      ]
    : [
        { key: "home", title: "Home", icon: Home, render: () => <HomeSection grade={grade} section={section} totalStudentsQueryKey={["students-count", school?.id, grade, section]} schoolId={school?.id ?? ""} /> },
        { key: "students", title: "Students", icon: Users, render: () => <StudentsSection schoolId={school?.id ?? ""} grade={grade} section={section} /> },
        { key: "report", title: "Report Card", icon: ScrollText, render: () => <ReportCardSection schoolId={school?.id ?? ""} grade={grade} section={section} /> },
        commonTextbooks,
      ];

  // Telegram-link gate
  const check = useServerFn(checkTelegramLink);
  const linkQ = useQuery({ queryKey: ["tg-status"], queryFn: () => check({}) });
  useEffect(() => {
    if (linkQ.data && !linkQ.data.linked) navigate({ to: "/connect-telegram" });
  }, [linkQ.data, navigate]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else navigate({ to: "/auth" });
  }

  if (schoolQ.isLoading || sectionsQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading school…
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">School not found</h1>
          <p className="text-sm text-muted-foreground mt-1">This school isn't in the Manager registry yet.</p>
          <Link to="/schools" className="text-primary hover:underline mt-3 inline-block">Back to schools</Link>
        </div>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLogout={handleLogout}>
          <SchoolBadge school={school} grade={grade} />
        </Header>
        <main className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{school.name}</h1>
          <p className="text-sm text-muted-foreground mt-2">Dire Dawa</p>
          <Card className="p-10 mt-8">
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              No grades or sections have been added for this school in the Manager backend yet.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  const active = tabs.find(t => t.key === tab) ?? tabs[0];
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-bg)" }}>
      <Header onLogout={handleLogout}>
        <SchoolBadge school={school} grade={grade} />
      </Header>
      <SelectorBar
        grades={grades}
        grade={grade}
        onGrade={(g) => { setGrade(g); setTab(g === "8" ? "ministry" : "home"); setSection(null); }}
        sections={sectionsForGrade}
        section={section}
        onSection={setSection}
      />

      <nav className="border-b bg-background/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.title}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {active.render()}
      </main>
    </div>
  );

  function SelectorBar({
    grades, grade, onGrade, sections, section, onSection,
  }: {
    grades: string[]; grade: string | null; onGrade: (g: string) => void;
    sections: string[]; section: string | null; onSection: (s: string) => void;
  }) {
    return (
      <div className="border-b bg-background/80 space-y-1 py-2">
        <div className="mx-auto max-w-7xl px-4 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-muted-foreground shrink-0 mr-1">Grade:</span>
          {grades.map(g => (
            <button
              key={g}
              onClick={() => onGrade(g)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                grade === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Grade {g}
            </button>
          ))}
        </div>
        {sections.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-muted-foreground shrink-0 mr-1">Section:</span>
            {sections.map(s => (
              <button
                key={s}
                onClick={() => onSection(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  section === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                Section {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SchoolBadge({ school, grade }: { school: { name: string }; grade: string | null }) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{school.name}</p>
          <p className="text-xs text-muted-foreground">Dire Dawa{grade ? ` • Grade ${grade}` : ""}</p>
        </div>
      </div>
    );
  }
}

function Header({ onLogout, children }: { onLogout: () => void; children?: React.ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/schools" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground shrink-0">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">All schools</span>
        </Link>
        <div className="flex-1 flex justify-center min-w-0">{children}</div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}