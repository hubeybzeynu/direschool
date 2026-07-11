import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, BookOpen, Award, Building2, Search, X, Download,
  Lock, ChevronLeft, ChevronRight, Printer, HelpCircle, ArrowLeft,
} from "lucide-react";
import {
  fetchStudents, findStudentByNo, fetchReportCardByStudent,
  type ManagerStudent, type ManagerReportCard,
} from "@/lib/manager-client";
import { textbookPageInfo } from "@/data/textbook";
import { resultImages, nameToIdMap } from "@/data/ministry";
import { TextbookViewer } from "./textbook-viewer";

const GH_RAW = "https://raw.githubusercontent.com/hubeybzeynu/grade9sts/main";
export const ministryImageUrl = (path: string) =>
  path.startsWith("http") ? path : `${GH_RAW}/public${path}`;
const textbookPdfUrl = (slug: string) => `${GH_RAW}/public/textbooks/${slug}_grade_9.pdf`;

type SectionProps = { schoolId: string; grade: string | null; section: string | null };

// ============================== HOME ==============================
export function HomeSection(props: SectionProps & { totalStudentsQueryKey?: unknown[] }) {
  const { schoolId, grade, section } = props;
  const q = useQuery({
    queryKey: ["students", schoolId, grade, section],
    queryFn: () => fetchStudents(schoolId, grade!, section),
    enabled: !!schoolId && !!grade,
  });
  const students = q.data ?? [];
  const showTextbooks = grade === "9";
  const subjects = Object.keys(textbookPageInfo).length;

  const stats = [
    { label: "Students", value: students.length, icon: GraduationCap },
    { label: "Section", value: section ?? "—", icon: Building2 },
    { label: "Grade", value: grade ?? "—", icon: Award },
    { label: "Subjects", value: showTextbooks ? subjects : "—", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-8 text-primary-foreground"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <h2 className="text-3xl font-bold">Welcome to the School Portal</h2>
        <p className="mt-2 opacity-90">
          Grade {grade ?? "—"} {section ? `• Section ${section}` : ""} — Academic Year 2017 E.C
        </p>
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
                <p className="text-2xl font-bold">{String(s.value)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showTextbooks && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Textbooks
            </h3>
            <p className="text-xs text-muted-foreground">Grade 9 • {subjects} subjects</p>
          </div>
          <TextbooksSection />
        </div>
      )}
    </div>
  );
}

// ============================== TEXTBOOKS ==============================
export function TextbooksSection() {
  const subjects = Object.keys(textbookPageInfo);
  const colors = [
    "bg-cyan-500","bg-violet-500","bg-amber-500","bg-emerald-500","bg-rose-500",
    "bg-indigo-500","bg-lime-500","bg-sky-500","bg-fuchsia-500","bg-yellow-500",
    "bg-teal-500","bg-red-500",
  ];
  const slugMap: Record<string, string> = {
    Amharic: "amharic", English: "english", Mathematics: "mathematics", Physics: "physics",
    Chemistry: "chemistry", Biology: "biology", Citizenship: "citizenship", ICT: "ict",
    Geography: "geography", History: "history", Economics: "economics", HPE: "hpe",
  };
  const [open, setOpen] = useState<{ subject: string; url: string } | null>(null);
  if (open) return <TextbookViewer subject={open.subject} url={open.url} onClose={() => setOpen(null)} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {subjects.map((s, i) => {
        const slug = slugMap[s] ?? s.toLowerCase();
        const url = textbookPdfUrl(slug);
        return (
          <Card key={s} className="p-5 flex flex-col">
            <div className={`w-14 h-14 rounded-2xl ${colors[i % colors.length]} flex items-center justify-center mb-4`}>
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold">{s}</h3>
            <p className="text-xs text-muted-foreground mb-4">Grade 9 Textbook</p>
            <div className="flex gap-2 mt-auto">
              <Button className="flex-1" onClick={() => setOpen({ subject: s, url })}>
                <BookOpen className="w-4 h-4 mr-1.5" /> Open
              </Button>
              <a
                href={url}
                download
                className="inline-flex items-center justify-center px-3 rounded-md border hover:bg-muted"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================== STUDENTS ==============================
export function StudentsSection({ schoolId, grade, section }: SectionProps) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<ManagerStudent | null>(null);
  const query = useQuery({
    queryKey: ["students", schoolId, grade, section],
    queryFn: () => fetchStudents(schoolId, grade!, section),
    enabled: !!schoolId && !!grade,
  });
  const students = query.data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter(s =>
      s.full_name.toLowerCase().includes(term) ||
      (s.english_name ?? "").toLowerCase().includes(term) ||
      (s.student_no ?? "").toLowerCase().includes(term)
    );
  }, [students, q]);

  if (picked) return <StudentDetail student={picked} onBack={() => setPicked(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or student number…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary">{filtered.length} students</Badge>
      </div>

      {query.isLoading && <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>}
      {!query.isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="font-medium">No students</p>
          <p className="text-sm text-muted-foreground mt-1">
            {students.length === 0 ? "No students yet for this grade/section." : "No students match your search."}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map(s => (
          <button
            key={s.id}
            onClick={() => setPicked(s)}
            className="text-left"
          >
            <Card className="overflow-hidden group hover:border-primary transition-colors">
              <div className="aspect-[3/4] bg-muted">
                {s.image_url ? (
                  <img src={s.image_url} alt={s.english_name ?? s.full_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="font-semibold text-xs truncate leading-tight">{s.english_name ?? s.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.full_name}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  {s.section && <span className="px-1.5 py-0.5 rounded bg-muted font-medium">{s.section}</span>}
                  {s.gender && <><span>•</span><span>{s.gender[0]}</span></>}
                  {s.age != null && <><span>•</span><span>{s.age}y</span></>}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

function StudentDetail({ student, onBack }: { student: ManagerStudent; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to students
      </Button>
      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-[220px_1fr] gap-0">
          <div className="aspect-[3/4] sm:aspect-auto bg-muted">
            {student.image_url ? (
              <img src={student.image_url} alt={student.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <GraduationCap className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="p-5 space-y-3">
            <div>
              <h2 className="text-2xl font-bold">{student.full_name}</h2>
              {student.english_name && <p className="text-sm text-muted-foreground">{student.english_name}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <Row label="Student #" value={student.student_no} />
              <Row label="Grade" value={student.grade} />
              <Row label="Section" value={student.section} />
              <Row label="Gender" value={student.gender} />
              <Row label="Age" value={student.age != null ? String(student.age) : null} />
              <Row label="Kebele" value={student.kebele} />
              <Row label="House No." value={student.house_no} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ============================== REPORT CARD ==============================
const RC_SUBJECTS = [
  "Amharic","English","Mathematics","General Science","Social Studies",
  "Citizenship Education","Performing & Visual Arts","Information Technology",
  "Health & Physical Education","Career & Technical Education",
];
const RC_CONDUCT = [
  "Cooperates Willingly","Refrains from disturbing others","Respects Authorities & Elders",
  "Handles School & Personal Property Carefully","Listens Attentively","Attendance & Punctuality",
];
const RC_QUARTERS = ["1st","2nd","3rd","4th"] as const;

export function ReportCardSection({ schoolId, grade, section }: SectionProps) {
  const [studentNo, setStudentNo] = useState("");
  const [error, setError] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<ManagerStudent | null>(null);
  const [card, setCard] = useState<ManagerReportCard | null>(null);

  async function handleSearch() {
    setError(""); setStudent(null); setCard(null); setUnlocked(false); setPwd(""); setPwdError("");
    const sid = studentNo.trim();
    if (!sid) { setError("Enter a student number."); return; }
    if (!grade || !section) { setError("Pick a grade and section first."); return; }
    setLoading(true);
    try {
      const st = await findStudentByNo(schoolId, grade, section, sid);
      if (!st) { setError("Student not found in this grade/section."); return; }
      setStudent(st);
      const rc = await fetchReportCardByStudent(st.id);
      if (!rc) { setError("No report card yet for this student."); return; }
      setCard(rc);
      if (!rc.card_password) setUnlocked(true);
    } finally {
      setLoading(false);
    }
  }

  function submitPwd() {
    if (!card) return;
    if (pwd === card.card_password) { setUnlocked(true); setPwdError(""); }
    else setPwdError("Incorrect password.");
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-1">Report Cards</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Enter the student number for Grade {grade ?? "—"} Section {section ?? "—"} to open the report card.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Student number"
            value={studentNo}
            onChange={e => setStudentNo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-1" /> {loading ? "…" : "Find"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </Card>

      {card && !unlocked && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Enter card password</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">This report card is locked.</p>
          <div className="flex gap-2">
            <Input type="password" placeholder="Password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && submitPwd()} />
            <Button onClick={submitPwd}>Unlock</Button>
          </div>
          {pwdError && <p className="text-xs text-destructive mt-2">{pwdError}</p>}
        </Card>
      )}

      {card && unlocked && student && (
        <ReportCardView card={card} student={student} onClose={() => { setCard(null); setStudent(null); }} />
      )}
    </div>
  );
}

function ReportCardView({
  card, student, onClose,
}: { card: ManagerReportCard; student: ManagerStudent; onClose: () => void }) {
  const subjectKeys = card.subjects
    ? Array.from(new Set([...RC_SUBJECTS, ...Object.keys(card.subjects)]))
    : RC_SUBJECTS;
  const conductKeys = card.conduct
    ? Array.from(new Set([...RC_CONDUCT, ...Object.keys(card.conduct)]))
    : RC_CONDUCT;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-2 border-b bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">
            {student.full_name} <span className="text-xs text-muted-foreground">#{student.student_no}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {card.sex ?? student.gender ?? "—"} • Age {card.age ?? student.age ?? "—"} •
            Grade {card.grade ?? student.grade ?? "—"} • {card.school_year ?? ""}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs border-b">
        <div><span className="text-muted-foreground">Teacher:</span> {card.teacher_name || "—"}</div>
        <div><span className="text-muted-foreground">Kebele:</span> {card.kebele || student.kebele || "—"}</div>
        <div><span className="text-muted-foreground">House No:</span> {card.house_no || student.house_no || "—"}</div>
        <div><span className="text-muted-foreground">Section:</span> {card.section ?? student.section ?? "—"}</div>
      </div>

      <div className="p-4 border-b">
        <h4 className="font-semibold text-sm mb-2">Subjects</h4>
        <div className="rounded-md border overflow-x-auto text-xs">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Subject</th>
                {RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}
                <th className="p-2">Avg</th>
              </tr>
            </thead>
            <tbody>
              {subjectKeys.map(sub => {
                const row = card.subjects?.[sub] ?? {};
                const nums = RC_QUARTERS.map(q => Number(row[q] ?? 0));
                const filled = nums.filter(n => n > 0);
                const avg = filled.length ? (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1) : "—";
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
              <tr>
                <th className="text-left p-2">Behavior</th>
                {RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}
              </tr>
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

      <div className="p-4 text-xs border-b">
        <h4 className="font-semibold text-sm mb-2">Attendance</h4>
        <table className="w-full border rounded-md overflow-hidden">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">Metric</th>
              {RC_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ["Days Present", card.days_present],
              ["Days Absent", card.days_absent],
              ["Times Tardy", card.times_tardy],
              ["Academic Days", card.total_academic_days],
            ].map(([label, obj]) => (
              <tr key={label as string} className="border-t">
                <td className="p-2">{label as string}</td>
                {RC_QUARTERS.map(q => (
                  <td key={q} className="p-2 text-center">
                    {(obj as Record<string, number | null> | null)?.[q] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {card.remarks && (
        <div className="p-4 text-sm">
          <span className="font-semibold">Remarks: </span>
          <span className="text-muted-foreground">{card.remarks}</span>
        </div>
      )}
    </Card>
  );
}

// ============================== MINISTRY (Grade 8) ==============================
// Search by name or registration No. Includes "forgot ID" name lookup with confirm.
export function MinistrySection() {
  const [mode, setMode] = useState<"id" | "name">("id");
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState<Array<{ name: string; id: string }> | null>(null);
  const [current, setCurrent] = useState<{ name: string; id: string } | null>(null);
  const [error, setError] = useState("");

  const allEntries = useMemo(() => Object.entries(nameToIdMap), []);

  function search() {
    setError(""); setConfirming(null); setCurrent(null);
    const term = q.trim();
    if (!term) { setError("Type something to search."); return; }

    if (mode === "id") {
      const img = resultImages[term as unknown as keyof typeof resultImages];
      if (!img) { setError("No result found for that registration number."); return; }
      const entry = allEntries.find(([, id]) => String(id) === term);
      setCurrent({ name: entry?.[0] ?? "Unknown", id: term });
      return;
    }

    // Name search
    const lower = term.toLowerCase();
    const matches = allEntries
      .filter(([name]) => name.toLowerCase().includes(lower))
      .map(([name, id]) => ({ name, id: String(id) }));

    if (matches.length === 0) { setError("No student matches that name."); return; }
    if (matches.length === 1) { setCurrent(matches[0]); return; }
    setConfirming(matches.slice(0, 20));
  }

  const img = current ? resultImages[current.id as unknown as keyof typeof resultImages] : null;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Grade 8 Ministry Result
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Search by registration number, or find your ID by name.
        </p>
        <div className="flex gap-1 mb-3">
          <Button size="sm" variant={mode === "id" ? "default" : "outline"} onClick={() => { setMode("id"); setQ(""); setError(""); }}>
            <Search className="h-3.5 w-3.5 mr-1" /> By Reg. No
          </Button>
          <Button size="sm" variant={mode === "name" ? "default" : "outline"} onClick={() => { setMode("name"); setQ(""); setError(""); }}>
            <HelpCircle className="h-3.5 w-3.5 mr-1" /> Forgot ID? Search by name
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={mode === "id" ? "Registration number (e.g. 219335)" : "Type your name…"}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
          <Button onClick={search}><Search className="h-4 w-4 mr-1" /> Find</Button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </Card>

      {confirming && (
        <Card className="p-5">
          <p className="text-sm font-semibold mb-2">Multiple matches — is one of these you?</p>
          <div className="space-y-2">
            {confirming.map(m => (
              <button
                key={m.id}
                onClick={() => { setCurrent(m); setConfirming(null); }}
                className="w-full text-left p-3 rounded-md border hover:border-primary hover:bg-accent/40 transition-colors"
              >
                <p className="font-medium text-sm">Is "{m.name}"?</p>
                <p className="text-xs text-muted-foreground">Reg. No: {m.id}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {current && (
        <Card className="overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="min-w-0">
              <p className="font-semibold truncate">{current.name}</p>
              <p className="text-xs text-muted-foreground">Reg. No: {current.id}</p>
            </div>
            <div className="flex gap-2">
              {img && (
                <a href={ministryImageUrl(img)} download className="inline-flex items-center px-3 py-1.5 rounded-md border text-sm hover:bg-muted">
                  <Download className="h-4 w-4 mr-1" /> Download
                </a>
              )}
              <Button size="sm" variant="ghost" onClick={() => setCurrent(null)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
          {img ? (
            <img src={ministryImageUrl(img)} alt={current.name} className="w-full" />
          ) : (
            <p className="p-10 text-center text-sm text-muted-foreground">No result image available.</p>
          )}
        </Card>
      )}
    </div>
  );
}

// Unused re-exports to avoid tree-shake-only warnings.
export { ChevronLeft, ChevronRight };