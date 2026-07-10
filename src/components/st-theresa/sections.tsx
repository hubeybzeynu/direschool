import { students } from "@/data/students";
import { textbookContentIndex, textbookPageInfo } from "@/data/textbook";
import { resultImages, nameToIdMap } from "@/data/ministry";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, BookOpen, FileText, Award, ScrollText, Building2, Search, X, ArrowLeft, Download, Dumbbell, Activity, FileQuestion, Lock, ChevronLeft, ChevronRight, Printer } from "lucide-react";

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
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/>Textbooks</h3>
          <p className="text-xs text-muted-foreground">Grade 9 • {subjects} subjects</p>
        </div>
        <TextbooksSection />
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
  return <ExamResultsLookup table="mid_results" title="Mid Exam" />;
}

export function FinalExamSection() {
  return <ExamResultsLookup table="final_results" title="Final Exam" />;
}

type ExamRow = {
  id: string; student_id: string; subject: string | null;
  grade_group: string | null; result_image_url: string;
  answer_image_url: string | null; student_name: string | null;
  student_password: string | null;
};

function ExamResultsLookup({ table, title }: { table: "mid_results" | "final_results"; title: string }) {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [verifiedStudent, setVerifiedStudent] = useState<{ id: number; name: string; english_name: string | null; image_url: string | null } | null>(null);
  const [error, setError] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [current, setCurrent] = useState<ExamRow | null>(null);
  const [pending, setPending] = useState<ExamRow | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const keyOf = (r: ExamRow) => `${r.student_id}|${r.subject ?? ""}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from(table).select("*").order("student_id", { ascending: true });
      if (active) { setRows((data as ExamRow[]) ?? []); setLoading(false); }
    };
    load();
    const ch = supabase.channel(`${table}-feed`)
      .on("postgres_changes", { event: "*", schema: "public", table }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [table]);

  const subjects = Array.from(new Set(rows.map(r => r.subject).filter(Boolean))) as string[];
  const grades = Array.from(new Set(rows.map(r => r.grade_group).filter(Boolean))) as string[];
  const filtered = rows.filter(r =>
    (subjectFilter === "all" || r.subject === subjectFilter) &&
    (gradeFilter === "all" || r.grade_group === gradeFilter)
  );

  async function handleVerify() {
    setError(""); setVerifiedStudent(null); setCurrent(null);
    const id = parseInt(studentId.trim(), 10);
    if (!id || isNaN(id)) { setError("Enter a valid student number."); return; }
    const { data } = await supabase.from("students").select("id, name, english_name, image_url").eq("id", id).maybeSingle();
    if (!data) { setError("Student not found in directory."); return; }
    setVerifiedStudent(data as any);
    const match = filtered.find(r => r.student_id === String(id));
    if (!match) { setError("No results uploaded for this student yet."); return; }
    openResult(match);
  }

  function openResult(r: ExamRow) {
    setShowAnswer(false);
    if (r.student_password && !unlocked.has(keyOf(r))) {
      setPending(r); setPwd(""); setPwdError(""); setCurrent(null);
    } else {
      setCurrent(r); setPending(null);
    }
  }

  function submitPwd() {
    if (!pending) return;
    if (pwd === pending.student_password) {
      const k = keyOf(pending);
      setUnlocked(prev => new Set(prev).add(k));
      setCurrent(pending); setPending(null); setPwd(""); setPwdError("");
    } else {
      setPwdError("Incorrect password.");
    }
  }

  function navigate(dir: "prev" | "next") {
    if (!current) return;
    const sameStudent = filtered.filter(r => r.student_id === current.student_id);
    if (sameStudent.length <= 1) return;
    const i = sameStudent.findIndex(r => keyOf(r) === keyOf(current));
    const j = dir === "prev" ? (i - 1 + sameStudent.length) % sameStudent.length : (i + 1) % sameStudent.length;
    openResult(sameStudent[j]);
  }

  if (loading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-1">{title} Results</h3>
        <p className="text-xs text-muted-foreground mb-4">Enter the student number to view their result, then unlock with the student password.</p>
        {(subjects.length > 0 || grades.length > 0) && (
          <div className="flex flex-wrap gap-3 mb-4">
            {subjects.length > 0 && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-xs text-muted-foreground mr-1">Subject:</span>
                <Button size="sm" variant={subjectFilter==="all"?"default":"outline"} onClick={()=>setSubjectFilter("all")}>All</Button>
                {subjects.map(s => <Button key={s} size="sm" variant={subjectFilter===s?"default":"outline"} onClick={()=>setSubjectFilter(s)}>{s}</Button>)}
              </div>
            )}
            {grades.length > 0 && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-xs text-muted-foreground mr-1">Grade:</span>
                <Button size="sm" variant={gradeFilter==="all"?"default":"outline"} onClick={()=>setGradeFilter("all")}>All</Button>
                {grades.map(g => <Button key={g} size="sm" variant={gradeFilter===g?"default":"outline"} onClick={()=>setGradeFilter(g)}>{g}</Button>)}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Input placeholder="Student number (e.g. 49)" value={studentId} onChange={e=>setStudentId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleVerify()} />
          <Button onClick={handleVerify}><Search className="h-4 w-4 mr-1"/>Find</Button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        {verifiedStudent && !error && (
          <div className="mt-3 flex items-center gap-3 p-2 rounded-lg bg-muted/40">
            {verifiedStudent.image_url && <img src={verifiedStudent.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{verifiedStudent.name}</p>
              <p className="text-xs text-muted-foreground truncate">{verifiedStudent.english_name} • #{verifiedStudent.id}</p>
            </div>
          </div>
        )}
      </Card>

      {pending && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-primary"/><h3 className="font-semibold text-sm">Enter result password</h3></div>
          <p className="text-xs text-muted-foreground mb-3">This result is locked. Ask the student for their password.</p>
          <div className="flex gap-2">
            <Input type="password" placeholder="Password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitPwd()} />
            <Button onClick={submitPwd}>Unlock</Button>
            <Button variant="ghost" onClick={()=>{setPending(null); setPwd(""); setPwdError("");}}>Cancel</Button>
          </div>
          {pwdError && <p className="text-xs text-destructive mt-2">{pwdError}</p>}
        </Card>
      )}

      {current && (
        <Card className="overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-2 border-b">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{current.student_name} <span className="text-xs text-muted-foreground">#{current.student_id}</span></p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {current.subject && <Badge variant="secondary" className="text-xs">{current.subject}</Badge>}
                {current.grade_group && <Badge variant="outline" className="text-xs">{current.grade_group}</Badge>}
              </div>
            </div>
            {filtered.filter(r => r.student_id === current.student_id).length > 1 && (
              <>
                <Button size="sm" variant="outline" onClick={()=>navigate("prev")}><ChevronLeft className="h-4 w-4"/></Button>
                <Button size="sm" variant="outline" onClick={()=>navigate("next")}><ChevronRight className="h-4 w-4"/></Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={()=>{setCurrent(null); setShowAnswer(false);}}><X className="h-4 w-4"/></Button>
          </div>
          <img src={current.result_image_url} alt="Result" className="w-full" />
          {current.answer_image_url && (
            <div className="p-4 border-t space-y-3">
              <Button className="w-full" variant={showAnswer?"outline":"default"} onClick={()=>setShowAnswer(!showAnswer)}>
                <FileText className="h-4 w-4 mr-2"/>{showAnswer?"Hide":"Reveal"} Answer Key
              </Button>
              {showAnswer && <img src={current.answer_image_url} alt="Answer key" className="w-full rounded-md" />}
              <a href={current.answer_image_url} download className="text-xs text-primary hover:underline flex items-center gap-1"><Download className="h-3 w-3"/>Download answer key</a>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const RC_SUBJECTS = ["Amharic","English","Mathematics","General Science","Social Studies","Citizenship Education","Performing & Visual Arts","Information Technology","Health & Physical Education","Career & Technical Education"];
const RC_CONDUCT = ["Cooperates Willingly","Refrains from disturbing others","Respects Authorities & Elders","Handles School & Personal Property Carefully","Listens Attentively","Attendance & Punctuality"];
const RC_QUARTERS = ["1st","2nd","3rd","4th"] as const;

type RC = {
  id: string; student_id: string; student_name: string | null; sex: string | null;
  age: number | null; kebele: string | null; house_no: string | null; teacher_name: string | null;
  school_year: string | null; grade: string | null;
  subjects: Record<string, Record<string, number | null>> | null;
  conduct: Record<string, Record<string, string | null>> | null;
  days_present: Record<string, number | null> | null;
  days_absent: Record<string, number | null> | null;
  times_tardy: Record<string, number | null> | null;
  total_academic_days: Record<string, number | null> | null;
  rank: Record<string, number | null> | null;
  remarks: string | null; promoted_to: string | null; detained_in_grade: string | null;
  card_password: string | null; total_students: number | null;
};

export function ReportCardSection() {
  const [studentId, setStudentId] = useState("");
  const [allCards, setAllCards] = useState<RC[]>([]);
  const [card, setCard] = useState<RC | null>(null);
  const [pending, setPending] = useState<RC | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("report_cards").select("*").order("student_id", { ascending: true });
      if (active) setAllCards((data as RC[]) ?? []);
    };
    load();
    const ch = supabase.channel("report_cards-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "report_cards" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  function openCard(c: RC) {
    if (c.card_password && !unlocked.has(c.id)) {
      setPending(c); setCard(null); setPwd(""); setPwdError("");
    } else {
      setCard(c); setPending(null);
    }
  }

  function handleSearch() {
    setError(""); setCard(null); setPending(null);
    const sid = studentId.trim();
    if (!sid) { setError("Enter a student number."); return; }
    const dir = students.find(s => String(s.id) === sid);
    const match = allCards.find(c => c.student_id === sid)
      ?? (dir && allCards.find(c => (c.student_name ?? "").toLowerCase().includes((dir.englishName || dir.name).toLowerCase())));
    if (!match) { setError("No report card found for this student."); return; }
    openCard(match);
  }

  function submitPwd() {
    if (!pending) return;
    if (pwd === pending.card_password) {
      setUnlocked(prev => new Set(prev).add(pending.id));
      setCard(pending); setPending(null); setPwd(""); setPwdError("");
    } else {
      setPwdError("Incorrect password.");
    }
  }

  function navigate(dir: "prev" | "next") {
    if (!card || allCards.length <= 1) return;
    const i = allCards.findIndex(c => c.id === card.id);
    const j = dir === "prev" ? (i - 1 + allCards.length) % allCards.length : (i + 1) % allCards.length;
    openCard(allCards[j]);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-1">Report Cards</h3>
        <p className="text-xs text-muted-foreground mb-4">Enter the student number to open their report card.</p>
        <div className="flex gap-2">
          <Input placeholder="Student number (e.g. 49)" value={studentId} onChange={e=>setStudentId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} />
          <Button onClick={handleSearch}><Search className="h-4 w-4 mr-1"/>Find</Button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </Card>

      {pending && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2"><Lock className="h-4 w-4 text-primary"/><h3 className="font-semibold text-sm">Enter card password</h3></div>
          <p className="text-xs text-muted-foreground mb-3">This report card is locked.</p>
          <div className="flex gap-2">
            <Input type="password" placeholder="Password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitPwd()} />
            <Button onClick={submitPwd}>Unlock</Button>
            <Button variant="ghost" onClick={()=>{setPending(null); setPwd("");}}>Cancel</Button>
          </div>
          {pwdError && <p className="text-xs text-destructive mt-2">{pwdError}</p>}
        </Card>
      )}

      {card && <ReportCardView card={card} onClose={()=>setCard(null)} onPrev={()=>navigate("prev")} onNext={()=>navigate("next")} />}
    </div>
  );
}

function ReportCardView({ card, onClose, onPrev, onNext }: { card: RC; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  const subjectKeys = card.subjects ? Array.from(new Set([...RC_SUBJECTS, ...Object.keys(card.subjects)])) : RC_SUBJECTS;
  const conductKeys = card.conduct ? Array.from(new Set([...RC_CONDUCT, ...Object.keys(card.conduct)])) : RC_CONDUCT;
  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-2 border-b bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{card.student_name} <span className="text-xs text-muted-foreground">#{card.student_id}</span></p>
          <p className="text-xs text-muted-foreground">{card.sex ?? "—"} • Age {card.age ?? "—"} • Grade {card.grade || "—"} • {card.school_year ?? ""}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onPrev}><ChevronLeft className="h-4 w-4"/></Button>
        <Button size="sm" variant="outline" onClick={onNext}><ChevronRight className="h-4 w-4"/></Button>
        <Button size="sm" variant="outline" onClick={()=>window.print()}><Printer className="h-4 w-4"/></Button>
        <Button size="sm" variant="outline" onClick={onClose}><X className="h-4 w-4"/></Button>
      </div>

      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs border-b">
        <div><span className="text-muted-foreground">Teacher:</span> {card.teacher_name || "—"}</div>
        <div><span className="text-muted-foreground">Kebele:</span> {card.kebele || "—"}</div>
        <div><span className="text-muted-foreground">House No:</span> {card.house_no || "—"}</div>
        <div><span className="text-muted-foreground">Class size:</span> {card.total_students ?? "—"}</div>
      </div>

      <div className="p-4 border-b">
        <h4 className="font-semibold text-sm mb-2">Subjects</h4>
        <div className="rounded-md border overflow-x-auto text-xs">
          <table className="w-full">
            <thead className="bg-muted">
              <tr><th className="text-left p-2">Subject</th>{RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}<th className="p-2">Avg</th></tr>
            </thead>
            <tbody>
              {subjectKeys.map(sub => {
                const row = card.subjects?.[sub] ?? {};
                const nums = RC_QUARTERS.map(q => Number(row[q] ?? 0));
                const filled = nums.filter(n => n > 0);
                const avg = filled.length ? (filled.reduce((a,b)=>a+b,0)/filled.length).toFixed(1) : "—";
                return (
                  <tr key={sub} className="border-t">
                    <td className="p-2">{sub}</td>
                    {RC_QUARTERS.map(q => <td key={q} className="p-2 text-center">{row[q] ?? "-"}</td>)}
                    <td className="p-2 text-center font-semibold">{avg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 border-b">
        <h4 className="font-semibold text-sm mb-2">Conduct</h4>
        <div className="rounded-md border overflow-x-auto text-xs">
          <table className="w-full">
            <thead className="bg-muted">
              <tr><th className="text-left p-2">Behavior</th>{RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}</tr>
            </thead>
            <tbody>
              {conductKeys.map(k => {
                const row = card.conduct?.[k] ?? {};
                return (
                  <tr key={k} className="border-t">
                    <td className="p-2">{k}</td>
                    {RC_QUARTERS.map(q => <td key={q} className="p-2 text-center">{row[q] ?? "-"}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 grid sm:grid-cols-2 gap-4 text-xs border-b">
        <div>
          <h4 className="font-semibold text-sm mb-2">Attendance</h4>
          <table className="w-full border rounded-md overflow-hidden">
            <thead className="bg-muted"><tr><th className="text-left p-2">Metric</th>{RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}</tr></thead>
            <tbody>
              {[
                ["Days Present", card.days_present],
                ["Days Absent", card.days_absent],
                ["Times Tardy", card.times_tardy],
                ["Academic Days", card.total_academic_days],
              ].map(([label, obj]) => (
                <tr key={label as string} className="border-t">
                  <td className="p-2">{label as string}</td>
                  {RC_QUARTERS.map(q => <td key={q} className="p-2 text-center">{(obj as any)?.[q] ?? "-"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Rank</h4>
          <table className="w-full border rounded-md overflow-hidden">
            <thead className="bg-muted"><tr>{RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}<th className="p-2">Avg</th></tr></thead>
            <tbody>
              <tr>{RC_QUARTERS.map(q => <td key={q} className="p-2 text-center">{card.rank?.[q] ?? "-"}</td>)}<td className="p-2 text-center font-semibold">{card.rank?.["Avg"] ?? "-"}</td></tr>
            </tbody>
          </table>
          <div className="mt-3 space-y-1">
            {card.promoted_to && <p><Badge variant="default" className="mr-2">Promoted</Badge>{card.promoted_to}</p>}
            {card.detained_in_grade && <p><Badge variant="destructive" className="mr-2">Detained</Badge>{card.detained_in_grade}</p>}
          </div>
        </div>
      </div>

      {card.remarks && (
        <div className="p-4 text-sm">
          <span className="font-semibold">Remarks: </span><span className="text-muted-foreground">{card.remarks}</span>
        </div>
      )}
    </Card>
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