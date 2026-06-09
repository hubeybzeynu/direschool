import { students } from "@/data/students";
import { textbookContentIndex, textbookPageInfo } from "@/data/textbook";
import { resultImages, nameToIdMap } from "@/data/ministry";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, BookOpen, FileText, Award, ScrollText, Building2, Search, X, ArrowLeft, Download, Dumbbell, Activity, FileQuestion } from "lucide-react";

const GH_RAW = "https://raw.githubusercontent.com/hubeybzeynu/grade9sts/main";
export const ministryImageUrl = (path: string) => path.startsWith("http") ? path : `${GH_RAW}/public${path}`;
const textbookPdfUrl = (slug: string) => `${GH_RAW}/public/textbooks/${slug}_grade_9.pdf`;

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
  const subjects = Object.keys(textbookPageInfo);
  const colors = ["bg-cyan-500","bg-violet-500","bg-amber-500","bg-emerald-500","bg-rose-500","bg-indigo-500","bg-lime-500","bg-sky-500","bg-fuchsia-500","bg-yellow-500","bg-teal-500","bg-red-500"];
  const slugMap: Record<string,string> = {
    Amharic:"amharic", English:"english", Mathematics:"mathematics", Physics:"physics",
    Chemistry:"chemistry", Biology:"biology", Citizenship:"citizenship", ICT:"ict",
    Geography:"geography", History:"history", Economics:"economics", HPE:"hpe",
  };
  const [open, setOpen] = useState<{ subject: string; url: string } | null>(null);
  const [page, setPage] = useState(1);

  if (open) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="h-14 flex items-center px-3 border-b gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setOpen(null)}><ArrowLeft className="h-5 w-5"/></Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{open.subject}</p>
            <p className="text-[10px] text-muted-foreground">Grade 9 • page {page}</p>
          </div>
          <a href={open.url} download className="p-2 rounded-lg hover:bg-muted"><Download className="h-4 w-4"/></a>
          <Button variant="ghost" size="icon" onClick={() => setOpen(null)}><X className="h-4 w-4"/></Button>
        </div>
        <div className="flex-1 overflow-hidden bg-muted">
          <iframe key={page} title={open.subject} src={`${open.url}#page=${page}&toolbar=1&view=FitH`} className="w-full h-full border-0"/>
        </div>
        <ContentFinder subject={open.subject} onGo={setPage}/>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {subjects.map((s, i) => {
        const slug = slugMap[s] ?? s.toLowerCase();
        const url = textbookPdfUrl(slug);
        return (
          <Card key={s} className="p-5 flex flex-col">
            <div className={`w-14 h-14 rounded-2xl ${colors[i%colors.length]} flex items-center justify-center mb-4`}>
              <BookOpen className="w-7 h-7 text-white"/>
            </div>
            <h3 className="text-lg font-bold">{s}</h3>
            <p className="text-xs text-muted-foreground mb-4">Grade 9 Textbook</p>
            <div className="flex gap-2 mt-auto">
              <Button className="flex-1" onClick={() => { setPage(1); setOpen({ subject: s, url }); }}>
                <BookOpen className="w-4 h-4 mr-1.5"/>Open
              </Button>
              <a href={url} download className="inline-flex items-center justify-center px-3 rounded-md border hover:bg-muted">
                <Download className="w-4 h-4"/>
              </a>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const typeConfig = {
  exercise: { label: "Exercises", icon: Dumbbell, color: "bg-blue-500" },
  activity: { label: "Activities", icon: Activity, color: "bg-emerald-500" },
  review:   { label: "Review", icon: FileQuestion, color: "bg-amber-500" },
} as const;

function ContentFinder({ subject, onGo }: { subject: string; onGo: (p: number) => void }) {
  const [openF, setOpenF] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"exercise"|"activity"|"review">("all");
  const frontMatter = textbookPageInfo[subject]?.frontMatter || 0;
  const items = useMemo(() => (textbookContentIndex[subject] || []).filter(it => it.page > frontMatter), [subject, frontMatter]);
  const filtered = items.filter(it => (filter==="all" || it.type===filter) && (!q || it.title.toLowerCase().includes(q.toLowerCase())));
  const counts = { all: items.length, exercise: items.filter(i=>i.type==="exercise").length, activity: items.filter(i=>i.type==="activity").length, review: items.filter(i=>i.type==="review").length };

  return (
    <>
      <button onClick={()=>setOpenF(!openF)} className="fixed bottom-6 right-6 z-[60] w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
        <Search className="w-5 h-5"/>
      </button>
      {openF && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/40" onClick={()=>setOpenF(false)}/>
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-2xl border-t max-h-[75vh] flex flex-col">
            <div className="flex justify-center pt-2 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30"/></div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary"/>{subject} Content ({items.length})</h3>
              <Button variant="ghost" size="icon" onClick={()=>setOpenF(false)}><X className="w-4 h-4"/></Button>
            </div>
            <div className="px-4 pb-2">
              <Input placeholder="Search exercises, activities, reviews…" value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
              {(["all","exercise","activity","review"] as const).map(t => (
                <button key={t} onClick={()=>setFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>
                  {t==="all"?`All (${counts.all})`:`${typeConfig[t].label} (${counts[t]})`}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {filtered.length===0 ? <p className="text-center text-sm text-muted-foreground py-8">No content found</p> : filtered.map((it, i) => {
                const cfg = typeConfig[it.type]; const Icon = cfg.icon;
                return (
                  <button key={i} onClick={()=>{ onGo(it.page); setOpenF(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted text-left">
                    <div className={`w-9 h-9 rounded-lg ${cfg.color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4 text-white"/></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.title}</p>
                      <p className="text-xs text-muted-foreground">Book page {it.page - frontMatter}</p>
                    </div>
                    <span className="text-xs text-primary font-mono shrink-0">p.{it.page - frontMatter}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
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
              {img && <div className="aspect-[3/4] bg-muted"><img src={ministryImageUrl(img)} alt={name} className="w-full h-full object-cover" loading="lazy" /></div>}
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