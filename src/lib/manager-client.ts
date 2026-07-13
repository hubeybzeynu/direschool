// Read-only Supabase client for the Manager backend.
// The Manager Supabase project owns all school/student/report-card data.
// The portal is read-only. Do NOT write from here.
import { createClient } from "@supabase/supabase-js";

const MANAGER_URL = "https://bfwirgutprmkzvpasolr.supabase.co";
const MANAGER_ANON = "sb_publishable_JiDFOE7U8rjbCDavsi0QqQ_KUKGHjAt";

export const manager = createClient(MANAGER_URL, MANAGER_ANON, {
  auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
});

export type ManagerSchool = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type ManagerSection = {
  id: string;
  school_id: string;
  grade: string;
  section: string;
};

export type ManagerStudent = {
  id: string;
  school_id: string;
  student_no: string | null;
  full_name: string;
  english_name: string | null;
  age: number | null;
  gender: string | null;
  grade: string | null;
  section: string | null;
  kebele: string | null;
  house_no: string | null;
  image_url: string | null;
};

export type ManagerReportCard = {
  id: string;
  school_id: string;
  student_id: string;
  grade: string | null;
  section: string | null;
  school_year: string | null;
  teacher_name: string | null;
  sex: string | null;
  age: number | null;
  kebele: string | null;
  house_no: string | null;
  subjects: Record<string, Record<string, number | null>> | null;
  conduct: Record<string, Record<string, string | null>> | null;
  days_present: Record<string, number | null> | null;
  days_absent: Record<string, number | null> | null;
  times_tardy: Record<string, number | null> | null;
  total_academic_days: Record<string, number | null> | null;
  remarks: string | null;
  card_password: string | null;
};

export type ManagerMinistryResult = {
  id: string;
  school_id: string;
  student_id: string;
  student_no: string | null;
  grade: string | null;
  school_year: string | null;
  subjects: Record<string, number | null> | null;
  total: number | null;
  average: number | null;
  percentile: number | null;
  promotion_status: string | null;
  promotion_label: string | null;
  photo_url: string | null;
};

export type ManagerTextbook = {
  id: string;
  grade: string;
  subject: string;
  title: string | null;
  cover_url: string | null;
  file_url: string | null;
  order_index: number | null;
};

export async function fetchSchools(): Promise<ManagerSchool[]> {
  const { data, error } = await manager
    .from("schools")
    .select("id, name, slug, logo_url")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ManagerSchool[];
}

export async function fetchSchoolBySlug(slug: string): Promise<ManagerSchool | null> {
  const { data, error } = await manager
    .from("schools")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ManagerSchool | null) ?? null;
}

export async function fetchSections(schoolId: string): Promise<ManagerSection[]> {
  const { data, error } = await manager
    .from("sections")
    .select("id, school_id, grade, section")
    .eq("school_id", schoolId);
  if (error) throw new Error(error.message);
  return (data ?? []) as ManagerSection[];
}

export async function fetchStudents(
  schoolId: string,
  grade: string,
  section: string | null,
): Promise<ManagerStudent[]> {
  let q = manager
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .eq("grade", grade)
    .order("full_name", { ascending: true });
  if (section) q = q.eq("section", section);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ManagerStudent[];
}

export async function findStudentByNo(
  schoolId: string,
  grade: string,
  section: string,
  studentNo: string,
): Promise<ManagerStudent | null> {
  const { data, error } = await manager
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .eq("grade", grade)
    .eq("section", section)
    .eq("student_no", studentNo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ManagerStudent | null) ?? null;
}

export async function fetchReportCardByStudent(studentId: string): Promise<ManagerReportCard | null> {
  const { data, error } = await manager
    .from("report_cards")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ManagerReportCard | null) ?? null;
}

// All cards for a cohort — used to compute rank across classmates.
export async function fetchReportCardsCohort(
  schoolId: string,
  grade: string,
  section: string | null,
  schoolYear: string | null,
): Promise<ManagerReportCard[]> {
  let q = manager
    .from("report_cards")
    .select("*")
    .eq("school_id", schoolId)
    .eq("grade", grade);
  if (section) q = q.eq("section", section);
  if (schoolYear) q = q.eq("school_year", schoolYear);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ManagerReportCard[];
}

// Ministry results — lookup by student registration/student_no.
export async function fetchMinistryByStudentNo(
  studentNo: string,
): Promise<{ result: ManagerMinistryResult; student: ManagerStudent | null; school: ManagerSchool | null } | null> {
  const { data, error } = await manager
    .from("ministry_results")
    .select("*")
    .eq("student_no", studentNo.trim())
    .order("school_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const result = data as ManagerMinistryResult;
  const [studentRes, schoolRes] = await Promise.all([
    result.student_id
      ? manager.from("students").select("*").eq("id", result.student_id).maybeSingle()
      : Promise.resolve({ data: null }),
    result.school_id
      ? manager.from("schools").select("id, name, slug, logo_url").eq("id", result.school_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    result,
    student: (studentRes.data as ManagerStudent | null) ?? null,
    school: (schoolRes.data as ManagerSchool | null) ?? null,
  };
}

export async function searchMinistryByName(
  term: string,
): Promise<Array<{ student: ManagerStudent; result: ManagerMinistryResult }>> {
  const t = term.trim();
  if (!t) return [];
  const like = `%${t}%`;
  const { data: students, error } = await manager
    .from("students")
    .select("*")
    .or(`full_name.ilike.${like},english_name.ilike.${like}`)
    .limit(30);
  if (error) throw new Error(error.message);
  const list = (students ?? []) as ManagerStudent[];
  if (!list.length) return [];
  const ids = list.map((s) => s.id);
  const { data: results } = await manager
    .from("ministry_results")
    .select("*")
    .in("student_id", ids);
  const byId = new Map<string, ManagerMinistryResult>(
    ((results ?? []) as ManagerMinistryResult[]).map((r) => [r.student_id, r]),
  );
  return list
    .filter((s) => byId.has(s.id))
    .map((s) => ({ student: s, result: byId.get(s.id)! }));
}

// Textbooks are shared across schools; keyed by grade.
export async function fetchTextbooksByGrade(grade: string): Promise<ManagerTextbook[]> {
  const { data, error } = await manager
    .from("textbooks")
    .select("id, grade, subject, title, cover_url, file_url, order_index")
    .eq("grade", grade)
    .order("order_index", { ascending: true })
    .order("subject", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ManagerTextbook[];
}