import { students } from "@/data/students";
import { textbookContentIndex, textbookPageInfo } from "@/data/textbook";
import { resultImages, nameToIdMap } from "@/data/ministry";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, BookOpen, FileText, Award, ScrollText, Building2, Search } from "lucide-react";

export function HomeSection() {
  const totalStudents = students.length;
  const sections = new Set(students.map(s => s.section)).size;
  const subjects = Object.keys(textbookPageInfo).length;
  const stats = [
    { label: "Students", value: totalStudents, icon: GraduationCap },
    { label: "Sections", value: sections, icon: Building2 },
    { label: "Subjects", value: subjects, icon: BookOpen },
    { label: "Ministry Results", value: Object.keys(resultImages).length, icon: Award },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-8 text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
        <h2 className="text-3xl font-bold">Welcome to St. Theresa Portal</h2>
        <p className="mt-2 opacity-90">Grade 9 — Academic Year 2017 E.C</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TextbooksSection() {
  const subjects = Object.keys(textbookContentIndex);
  const [active, setActive] = useState(subjects[0]);
  const info = textbookPageInfo[active];
  const items = textbookContentIndex[active] ?? [];
  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
      <Card className="p-2 h-fit lg:sticky lg:top-4">
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {subjects.map(s => (
            <button key={s} onClick={() => setActive(s)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${active===s?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">{active}</h3>
            {info && <p className="text-xs text-muted-foreground">{info.totalPages} pages • {info.frontMatter} front-matter pages</p>}
          </div>
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 max-h-[65vh] overflow-y-auto">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between border rounded-md p-3 text-sm">
              <span className="truncate">{it.title}</span>
              <Badge variant="outline" className="ml-2 shrink-0">p.{it.page}</Badge>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No items.</p>}
        </div>
      </Card>
    </div>
  );
}

export function StudentsSection() {
  const [q, setQ] = useState("");
  const [section, setSection] = useState<string>("all");
  const sections = Array.from(new Set(students.map(s => s.section))).sort();
  const filtered = students.filter(s => {
    if (section !== "all" && s.section !== section) return false;
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return s.name.toLowerCase().includes(t) || s.englishName.toLowerCase().includes(t);
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant={section==="all"?"default":"outline"} onClick={()=>setSection("all")}>All</Button>
          {sections.map(s => (
            <Button key={s} size="sm" variant={section===s?"default":"outline"} onClick={()=>setSection(s)}>{s}</Button>
          ))}
        </div>
        <Badge variant="secondary">{filtered.length} students</Badge>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(s => (
          <Card key={s.id} className="overflow-hidden">
            <div className="aspect-square bg-muted">
              <img src={s.imageUrl} alt={s.englishName} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground truncate">{s.englishName}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{s.section}</Badge>
                <Badge variant="outline" className="text-xs">{s.gender}</Badge>
                <Badge variant="outline" className="text-xs">Age {s.age}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ResultsList({ rows, emptyLabel }: { rows: Array<{ student_name?: string | null; result_image_url: string; answer_image_url?: string | null }>, emptyLabel: string }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter(r => (r.student_name ?? "").toLowerCase().includes(q.toLowerCase()));
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium">{emptyLabel}</p>
        <p className="text-sm text-muted-foreground mt-1">No results posted yet for this exam.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by student…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r, i) => (
          <Card key={i} className="overflow-hidden">
            <img src={r.result_image_url} alt={r.student_name ?? ""} className="w-full" loading="lazy" />
            <div className="p-3">
              <p className="font-semibold text-sm">{r.student_name}</p>
              {r.answer_image_url && (
                <a className="text-xs text-primary hover:underline" href={r.answer_image_url} target="_blank" rel="noreferrer">View answer key</a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MidExamSection() {
  return <ExamResults table="mid_results" emptyLabel="Mid Exam Results" />;
}

export function FinalExamSection() {
  return <ExamResults table="final_results" emptyLabel="Final Exam Results" />;
}

type ExamRow = {
  id: string; student_id: string; subject: string | null;
  grade_group: string | null; result_image_url: string;
  answer_image_url: string | null; student_name: string | null;
};

function ExamResults({ table, emptyLabel }: { table: "mid_results" | "final_results"; emptyLabel: string }) {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (active) { setRows((data as ExamRow[]) ?? []); setLoading(false); }
    };
    load();
    const ch = supabase.channel(`${table}-feed`)
      .on("postgres_changes", { event: "*", schema: "public", table }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [table]);
  if (loading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>;
  return <ResultsList rows={rows} emptyLabel={emptyLabel} />;
}

export function ReportCardSection() {
  const [q, setQ] = useState("");
  const [allCards, setAllCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("report_cards").select("*").order("created_at", { ascending: false });
      if (active) { setAllCards(data ?? []); setLoading(false); }
    };
    load();
    const ch = supabase.channel("report_cards-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "report_cards" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);
  const cards = allCards.filter(c => c.student_name?.toLowerCase().includes(q.toLowerCase()));
  if (loading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>;
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by student…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {cards.map((c: any) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold">{c.student_name}</p>
                <p className="text-xs text-muted-foreground">{c.sex} • Age {c.age} • Grade {c.grade || "—"}</p>
              </div>
              <Badge>{c.school_year}</Badge>
            </div>
            {c.subjects && typeof c.subjects === "object" && (
              <div className="rounded-md border overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr><th className="text-left p-2">Subject</th><th className="p-2">1st</th><th className="p-2">2nd</th><th className="p-2">3rd</th><th className="p-2">4th</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(c.subjects).map(([sub, v]: any) => (
                      <tr key={sub} className="border-t">
                        <td className="p-2">{sub}</td>
                        <td className="p-2 text-center">{v["1st"] || "-"}</td>
                        <td className="p-2 text-center">{v["2nd"] || "-"}</td>
                        <td className="p-2 text-center">{v["3rd"] || "-"}</td>
                        <td className="p-2 text-center">{v["4th"] || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {c.remarks && <p className="text-xs mt-3 text-muted-foreground">Remarks: {c.remarks}</p>}
          </Card>
        ))}
        {cards.length === 0 && <Card className="p-10 text-center col-span-full"><ScrollText className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No report cards match.</p></Card>}
      </div>
    </div>
  );
}

export function MinistrySection() {
  const [q, setQ] = useState("");
  const entries = Object.entries(nameToIdMap)
    .filter(([name]) => name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 200);
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by student…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map(([name, id]) => {
          const img = resultImages[id as any];
          return (
            <Card key={`${name}-${id}`} className="overflow-hidden">
              {img && <div className="aspect-[3/4] bg-muted"><img src={img} alt={name} className="w-full h-full object-cover" loading="lazy" /></div>}
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{name}</p>
                <p className="text-xs text-muted-foreground">Reg. No: {id}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}