import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, timingSafeEqual } from "node:crypto";

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const verifyStudentUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.STUDENT_VIEW_UNLOCK_PASSWORD;
    if (!expected) return { ok: false as const, reason: "not_configured" as const };
    if (typeof data.password !== "string" || data.password.length === 0) {
      return { ok: false as const, reason: "empty" as const };
    }
    return matches(data.password, expected)
      ? { ok: true as const }
      : { ok: false as const, reason: "wrong" as const };
  });