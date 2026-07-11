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