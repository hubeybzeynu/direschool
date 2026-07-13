// Shared helpers for report card completeness, promotion, and ranking.
// Mirrors the manager-side rules in the patch notes.
import type { ManagerReportCard } from "./manager-client";

export const REPORT_QUARTERS = ["1st", "2nd", "3rd", "4th"] as const;
export type Quarter = (typeof REPORT_QUARTERS)[number];

export const REPORT_SUBJECTS = [
  "Amharic",
  "English",
  "Mathematics",
  "General Science",
  "Social Studies",
  "Citizenship Education",
  "Performing & Visual Arts",
  "Information Technology",
  "Health & Physical Education",
  "Career & Technical Education",
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function subjectAverage(row: Record<string, number | null> | undefined | null): number | null {
  if (!row) return null;
  const vals = REPORT_QUARTERS.map((q) => num(row[q])).filter((n) => n > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function isCardComplete(card: ManagerReportCard): boolean {
  if (!card.subjects) return false;
  return REPORT_SUBJECTS.every((s) => {
    const row = card.subjects![s];
    if (!row) return false;
    return REPORT_QUARTERS.every((q) => num(row[q]) > 0);
  });
}

export function grandAverage(card: ManagerReportCard): number | null {
  if (!card.subjects) return null;
  const avgs = REPORT_SUBJECTS
    .map((s) => subjectAverage(card.subjects?.[s]))
    .filter((v): v is number => v != null);
  if (avgs.length === 0) return null;
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
}

export type PromotionStatus =
  | { state: "incomplete" }
  | { state: "promoted"; nextGrade: string; label: string; fails: number }
  | { state: "detained"; grade: string; label: string; fails: number };

export function computePromotionStatus(card: ManagerReportCard): PromotionStatus {
  if (!isCardComplete(card)) return { state: "incomplete" };
  let fails = 0;
  for (const s of REPORT_SUBJECTS) {
    const avg = subjectAverage(card.subjects?.[s]);
    if (avg == null || avg < 60) fails++;
  }
  const gNum = Number(card.grade ?? "");
  const grade = card.grade ?? "";
  if (fails >= 2) {
    return { state: "detained", grade, label: `Detained in Grade ${grade || "?"}`, fails };
  }
  const next = Number.isFinite(gNum) && gNum > 0 ? String(gNum + 1) : "?";
  return { state: "promoted", nextGrade: next, label: `Promoted to Grade ${next}`, fails };
}

// Only complete cards contribute to the ranking pool.
function tieBreak(a: ManagerReportCard, b: ManagerReportCard): number {
  return String(a.student_id).localeCompare(String(b.student_id));
}

export function computeOverallRank(
  card: ManagerReportCard,
  cohort: ManagerReportCard[],
): { rank: number; total: number } | null {
  const pool = cohort.filter(isCardComplete);
  if (!pool.length || !isCardComplete(card)) return null;
  const ranked = [...pool].sort((a, b) => {
    const av = grandAverage(a) ?? -1;
    const bv = grandAverage(b) ?? -1;
    if (bv !== av) return bv - av;
    return tieBreak(a, b);
  });
  const idx = ranked.findIndex((c) => c.student_id === card.student_id);
  if (idx < 0) return null;
  return { rank: idx + 1, total: ranked.length };
}

export function computeSubjectRank(
  card: ManagerReportCard,
  cohort: ManagerReportCard[],
  subject: string,
): { rank: number; total: number } | null {
  const pool = cohort.filter(isCardComplete);
  if (!pool.length || !isCardComplete(card)) return null;
  const ranked = [...pool].sort((a, b) => {
    const av = subjectAverage(a.subjects?.[subject]) ?? -1;
    const bv = subjectAverage(b.subjects?.[subject]) ?? -1;
    if (bv !== av) return bv - av;
    return tieBreak(a, b);
  });
  const idx = ranked.findIndex((c) => c.student_id === card.student_id);
  if (idx < 0) return null;
  return { rank: idx + 1, total: ranked.length };
}