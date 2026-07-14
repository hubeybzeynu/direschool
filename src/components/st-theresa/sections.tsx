import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyStudentUnlock } from "@/lib/unlock.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, BookOpen, Award, Building2, Search, X, Download,
  Lock, Unlock, Printer, HelpCircle, ArrowLeft, Trophy,
} from "lucide-react";
import {
  fetchStudents, findStudentByNo, fetchReportCardByStudent,
  fetchReportCardsCohort, fetchTextbooksByGrade,
  fetchMinistryByStudentNo, searchMinistryByName,
  type ManagerStudent, type ManagerReportCard, type ManagerTextbook,
  type ManagerMinistryResult, type ManagerSchool,
} from "@/lib/manager-client";
import {
  REPORT_QUARTERS, REPORT_SUBJECTS,
  isCardComplete, computePromotionStatus,
  computeOverallRank, computeSubjectRank, subjectAverage, grandAverage,
} from "@/lib/report-card";
import { textbookPageInfo } from "@/data/textbook";
import { TextbookViewer } from "./textbook-viewer";

const GH_RAW = "https://raw.githubusercontent.com/hubeybzeynu/grade9sts/main";
const grade9SlugMap: Record<string, string> = {
  Amharic: "amharic", English: "english", Mathematics: "mathematics", Physics: "physics",
  Chemistry: "chemistry", Biology: "biology", Citizenship: "citizenship", ICT: "ict",
  Geography: "geography", History: "history", Economics: "economics", HPE: "hpe",
};
const grade9FallbackTextbooks = (): ManagerTextbook[] =>
  Object.keys(textbookPageInfo).map((subject, i) => ({
    id: `g9-${subject}`,
    grade: "9",
    subject,
    title: `${subject} — Grade 9`,
    cover_url: null,
    file_url: `${GH_RAW}/public/textbooks/${grade9SlugMap[subject] ?? subject.toLowerCase()}_grade_9.pdf`,
    order_index: i,
  }));

// ============================== SESSION UNLOCK (shared) ==============================
const UNLOCK_KEY = "portal:student-view-unlocked";
function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}
function setUnlocked(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) sessionStorage.setItem(UNLOCK_KEY, "1");
  else sessionStorage.removeItem(UNLOCK_KEY);
  window.dispatchEvent(new Event("portal:unlock-change"));
}
export function useSessionUnlock() {
  const [unlocked, set] = useState<boolean>(() => isUnlocked());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => set(isUnlocked());
    window.addEventListener("portal:unlock-change", on);
    return () => window.removeEventListener("portal:unlock-change", on);
  }, []);
  return { unlocked, lock: () => { setUnlocked(false); set(false); } };
}

function UnlockPrompt({ onUnlocked, onCancel }: { onUnlocked: () => void; onCancel: () => void }) {
  const verify = useServerFn(verifyStudentUnlock);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const res = await verify({ data: { password: pwd } });
      if (res.ok) { setUnlocked(true); onUnlocked(); }
      else {
        setErr(res.reason === "not_configured" ? "Unlock is not configured yet." : "Incorrect password.");
        setShake(true); setTimeout(() => setShake(false), 400);
      }
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur p-4"
         onKeyDown={e => e.key === "Escape" && onCancel()}>
      <Card className={`w-full max-w-sm p-5 ${shake ? "animate-[shake_0.4s]" : ""}`}
            style={{ animationName: shake ? "shake" : undefined }}>
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Unlock student view</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Enter the portal password to open report cards.</p>
        <Input
          autoFocus
          type="password"
          placeholder="Password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
        />
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={busy}>{busy ? "…" : "Unlock"}</Button>
        </div>
      </Card>
      <style>{`@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

export function LockButton() {
  const { unlocked, lock } = useSessionUnlock();
  if (!unlocked) return null;
  return (
    <Button variant="outline" size="sm" onClick={lock} title="Lock student view">
      <Unlock className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Lock</span>
    </Button>
  );
}

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
  const tb = useQuery({
    queryKey: ["textbooks", grade],
    queryFn: () => fetchTextbooksByGrade(grade!),
    enabled: !!grade,
  });
  const tbList = (tb.data && tb.data.length > 0)
    ? tb.data
    : (grade === "9" ? grade9FallbackTextbooks() : []);

  const stats = [
    { label: "Students", value: students.length, icon: GraduationCap },
    { label: "Section", value: section ?? "—", icon: Building2 },
    { label: "Grade", value: grade ?? "—", icon: Award },
    { label: "Textbooks", value: tbList.length || "—", icon: BookOpen },
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
    </div>
  );
}

// ============================== TEXTBOOKS (per grade, shared) ==============================
export function TextbooksSection({ grade }: { grade: string | null }) {
  const q = useQuery({
    queryKey: ["textbooks", grade],
    queryFn: () => fetchTextbooksByGrade(grade!),
    enabled: !!grade,
  });
  const books = (q.data && q.data.length > 0)
    ? q.data
    : (grade === "9" ? grade9FallbackTextbooks() : []);

  const colors = [
    "bg-cyan-500","bg-violet-500","bg-amber-500","bg-emerald-500","bg-rose-500",
    "bg-indigo-500","bg-lime-500","bg-sky-500","bg-fuchsia-500","bg-yellow-500",
    "bg-teal-500","bg-red-500",
  ];
  const [open, setOpen] = useState<{ subject: string; url: string } | null>(null);
  if (open) return <TextbookViewer subject={open.subject} url={open.url} onClose={() => setOpen(null)} />;

  if (!grade) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Pick a grade to see its textbooks.</Card>;
  }
  if (q.isLoading) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Loading textbooks…</Card>;
  }
  if (!books.length) {
    return (
      <Card className="p-10 text-center">
        <p className="font-medium">No textbooks yet</p>
        <p className="text-sm text-muted-foreground mt-1">Grade {grade} textbooks haven't been added to the shared catalog.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Grade {grade} Textbooks
        </h3>
        <Badge variant="secondary">{books.length} {books.length === 1 ? "book" : "books"}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {books.map((b, i) => (
          <Card key={b.id} className="p-5 flex flex-col">
            <div className={`w-14 h-14 rounded-2xl ${colors[i % colors.length]} flex items-center justify-center mb-4 overflow-hidden`}>
              {b.cover_url ? (
                <img src={b.cover_url} alt={b.subject} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-7 h-7 text-white" />
              )}
            </div>
            <h3 className="text-lg font-bold">{b.subject}</h3>
            <p className="text-xs text-muted-foreground mb-4">{b.title ?? `Grade ${b.grade} Textbook`}</p>
            <div className="flex gap-2 mt-auto">
              {b.file_url ? (
                <>
                  <Button className="flex-1" onClick={() => setOpen({ subject: b.subject, url: b.file_url! })}>
                    <BookOpen className="w-4 h-4 mr-1.5" /> Open
                  </Button>
                  <a
                    href={b.file_url}
                    download
                    className="inline-flex items-center justify-center px-3 rounded-md border hover:bg-muted"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No file linked.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
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
          <button key={s.id} onClick={() => setPicked(s)} className="text-left">
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
const RC_CONDUCT = [
  "Cooperates Willingly","Refrains from disturbing others","Respects Authorities & Elders",
  "Handles School & Personal Property Carefully","Listens Attentively","Attendance & Punctuality",
];

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
    ? Array.from(new Set([...REPORT_SUBJECTS, ...Object.keys(card.subjects)]))
    : REPORT_SUBJECTS;
  const conductKeys = card.conduct
    ? Array.from(new Set([...RC_CONDUCT, ...Object.keys(card.conduct)]))
    : RC_CONDUCT;

  const cohortQ = useQuery({
    queryKey: ["cohort", card.school_id, card.grade, card.section, card.school_year],
    queryFn: () => fetchReportCardsCohort(card.school_id, card.grade!, card.section, card.school_year),
    enabled: !!card.school_id && !!card.grade,
  });
  const cohort = cohortQ.data ?? [card];

  const complete = isCardComplete(card);
  const promotion = computePromotionStatus(card);
  const overall = complete ? computeOverallRank(card, cohort) : null;
  const grand = grandAverage(card);

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
                {REPORT_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}
                <th className="p-2">Average</th>
                <th className="p-2">Rank</th>
              </tr>
            </thead>
            <tbody>
              {subjectKeys.map(sub => {
                const row = card.subjects?.[sub] ?? {};
                const avg = subjectAverage(row);
                const rank = complete ? computeSubjectRank(card, cohort, sub) : null;
                return (
                  <tr key={sub} className="border-t">
                    <td className="p-2">{sub}</td>
                    {REPORT_QUARTERS.map(q => <td key={q} className="p-2 text-center">{row[q] ?? "-"}</td>)}
                    <td className="p-2 text-center font-semibold">{avg == null ? "—" : avg.toFixed(1)}</td>
                    <td className="p-2 text-center text-muted-foreground">
                      {rank ? `${rank.rank} / ${rank.total}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall + promotion */}
      <div className="p-4 border-b grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Overall average</p>
          <p className="text-xl font-bold">{grand == null ? "—" : grand.toFixed(2)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" /> Overall rank
          </p>
          <p className="text-xl font-bold">
            {overall ? `${overall.rank} / ${overall.total}` : "—"}
          </p>
          {!complete && (
            <p className="text-[11px] text-muted-foreground mt-1">Ranks appear once all 4 quarters are entered.</p>
          )}
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Promotion</p>
          {promotion.state === "incomplete" ? (
            <p className="text-xs mt-1">Promotion status will appear once the 4th quarter is released.</p>
          ) : promotion.state === "promoted" ? (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
              ✓ {promotion.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
              ✕ {promotion.label}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 border-b">
        <h4 className="font-semibold text-sm mb-2">Conduct</h4>
        <div className="rounded-md border overflow-x-auto text-xs">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Behavior</th>
                {REPORT_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}
              </tr>
            </thead>
            <tbody>
              {conductKeys.map(k => {
                const row = card.conduct?.[k] ?? {};
                return (
                  <tr key={k} className="border-t">
                    <td className="p-2">{k}</td>
                    {REPORT_QUARTERS.map(q => <td key={q} className="p-2 text-center">{row[q] ?? "-"}</td>)}
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
              {REPORT_QUARTERS.map(q => <th key={q} className="p-2">{q}</th>)}
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
                {REPORT_QUARTERS.map(q => (
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

// ============================== MINISTRY RESULTS ==============================
// Public viewer sourced from ministry_results in the Manager DB.
// Search by student registration number, or by name (with confirm on ambiguity).
export function MinistrySection() {
  const [mode, setMode] = useState<"id" | "name">("id");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<Array<{ student: ManagerStudent; result: ManagerMinistryResult }> | null>(null);
  const [current, setCurrent] = useState<{ result: ManagerMinistryResult; student: ManagerStudent | null; school: ManagerSchool | null } | null>(null);

  async function search() {
    setError(""); setConfirming(null); setCurrent(null);
    const term = q.trim();
    if (!term) { setError("Type something to search."); return; }
    setLoading(true);
    try {
      if (mode === "id") {
        const found = await fetchMinistryByStudentNo(term);
        if (!found) { setError("No ministry result found for that registration number."); return; }
        setCurrent(found);
      } else {
        const matches = await searchMinistryByName(term);
        if (!matches.length) { setError("No student matches that name."); return; }
        if (matches.length === 1) {
          const found = await fetchMinistryByStudentNo(matches[0].student.student_no ?? "");
          if (found) setCurrent(found);
          else setError("No ministry result attached to that student.");
          return;
        }
        setConfirming(matches);
      }
    } catch (e: any) {
      setError(e?.message ?? "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Ministry Result
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Search by student registration number, or find your ID by name.
        </p>
        <div className="flex gap-1 mb-3">
          <Button size="sm" variant={mode === "id" ? "default" : "outline"} onClick={() => { setMode("id"); setQ(""); setError(""); }}>
            <Search className="h-3.5 w-3.5 mr-1" /> By Student ID
          </Button>
          <Button size="sm" variant={mode === "name" ? "default" : "outline"} onClick={() => { setMode("name"); setQ(""); setError(""); }}>
            <HelpCircle className="h-3.5 w-3.5 mr-1" /> Forgot ID? Search by name
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={mode === "id" ? "Student registration number" : "Type student name…"}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={loading}>
            <Search className="h-4 w-4 mr-1" /> {loading ? "…" : "Find"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </Card>

      {confirming && (
        <Card className="p-5">
          <p className="text-sm font-semibold mb-2">Multiple matches — is one of these you?</p>
          <div className="space-y-2">
            {confirming.map(m => (
              <button
                key={m.result.id}
                onClick={async () => {
                  setConfirming(null);
                  const found = await fetchMinistryByStudentNo(m.student.student_no ?? "");
                  if (found) setCurrent(found);
                }}
                className="w-full text-left p-3 rounded-md border hover:border-primary hover:bg-accent/40 transition-colors"
              >
                <p className="font-medium text-sm">{m.student.full_name}</p>
                <p className="text-xs text-muted-foreground">Reg. No: {m.student.student_no ?? "—"} • Grade {m.result.grade ?? "?"}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {current && <MinistryResultCard payload={current} onClose={() => setCurrent(null)} />}
    </div>
  );
}

function MinistryResultCard({
  payload, onClose,
}: {
  payload: { result: ManagerMinistryResult; student: ManagerStudent | null; school: ManagerSchool | null };
  onClose: () => void;
}) {
  const { result, student, school } = payload;
  const g = result.grade ?? student?.grade ?? "?";
  const year = result.school_year ?? "";
  const subjectRows = result.subjects ? Object.entries(result.subjects) : [];
  const promoted = result.promotion_status === "promoted";
  const detained = result.promotion_status === "detained";
  const photo = result.photo_url ?? student?.image_url ?? null;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b bg-muted/30">
        <div className="min-w-0">
          <p className="font-semibold truncate">{student?.full_name ?? "Ministry Result"}</p>
          <p className="text-xs text-muted-foreground">Reg. No: {result.student_no ?? student?.student_no ?? "—"}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Result box, styled with portal tokens */}
      <div className="p-6 space-y-5">
        <div className="text-center space-y-1">
          {school?.logo_url && (
            <img src={school.logo_url} alt={school.name} className="h-14 w-14 mx-auto object-contain" />
          )}
          {school && (
            <>
              <p className="text-lg font-bold">{school.name}</p>
              <p className="text-xs text-muted-foreground">Dire Dawa</p>
            </>
          )}
          <p className="mt-2 text-sm font-semibold" lang="am">
            የ{year || "…"} ዓ.ም. የ{g}ኛ ክፍል ማጠናቀቂያ ፈተና ውጤት
          </p>
          <p className="text-xs text-muted-foreground">Grade {g} National Exam Result{year ? ` — ${year} E.C.` : ""}</p>
        </div>

        <div className="grid sm:grid-cols-[140px_1fr] gap-4 items-start">
          <div className="aspect-[3/4] w-full max-w-[140px] mx-auto sm:mx-0 rounded-md overflow-hidden border bg-muted">
            {photo ? (
              <img src={photo} alt={student?.full_name ?? "Candidate"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <GraduationCap className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
              <Row label="Name" value={student?.full_name ?? "—"} />
              <Row label="English" value={student?.english_name ?? null} />
              <Row label="Reg. No" value={result.student_no ?? student?.student_no ?? null} />
              <Row label="Grade" value={g} />
              <Row label="School" value={school?.name ?? null} />
              <Row label="Year (E.C.)" value={year || null} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Subjects</h4>
          <div className="rounded-md border overflow-x-auto text-sm">
            <table className="w-full">
              <thead className="bg-muted">
                <tr><th className="text-left p-2">Subject</th><th className="p-2 text-right">Mark</th></tr>
              </thead>
              <tbody>
                {subjectRows.length === 0 ? (
                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground text-xs">No subjects recorded.</td></tr>
                ) : subjectRows.map(([k, v]) => (
                  <tr key={k} className="border-t"><td className="p-2">{k}</td><td className="p-2 text-right font-semibold">{v ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Totals</h4>
          <div className="rounded-md border overflow-hidden text-sm">
            <table className="w-full">
              <tbody>
                <tr className="border-b"><td className="p-2 text-muted-foreground">Total</td><td className="p-2 text-right font-semibold">{result.total ?? "—"}</td></tr>
                <tr className="border-b"><td className="p-2 text-muted-foreground">Average</td><td className="p-2 text-right font-semibold">{result.average != null ? Number(result.average).toFixed(2) : "—"}</td></tr>
                {result.percentile != null && (
                  <tr className="border-b"><td className="p-2 text-muted-foreground">Percentile</td><td className="p-2 text-right font-semibold">{Number(result.percentile).toFixed(2)}</td></tr>
                )}
                <tr>
                  <td className="p-2 text-muted-foreground">Status</td>
                  <td className="p-2 text-right">
                    {promoted ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/40">
                        ✓ {result.promotion_label ?? "Promoted"}
                      </span>
                    ) : detained ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/40">
                        ✕ {result.promotion_label ?? "Detained"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{result.promotion_label ?? "—"}</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}