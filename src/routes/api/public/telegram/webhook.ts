import { createFileRoute } from "@tanstack/react-router";
import {
  fetchSchools,
  fetchSchoolBySlug,
  fetchSections,
  fetchStudents,
  fetchReportCardByStudent,
  manager,
  type ManagerStudent,
  type ManagerReportCard,
} from "@/lib/manager-client";
import { textbookPageInfo } from "@/data/textbook";
import { nameToIdMap, resultImages } from "@/data/ministry";

const TG_API = "https://api.telegram.org";
const PORTAL_ORIGIN = "https://direschool.lovable.app";
const GH_RAW = "https://raw.githubusercontent.com/hubeybzeynu/grade9sts/main";
const ADMIN_CHAT_ID = 6218343992;
const PAGE_SIZE = 8;

const SUBJECT_SLUGS: Record<string, string> = {
  Amharic: "amharic", English: "english", Mathematics: "mathematics", Physics: "physics",
  Chemistry: "chemistry", Biology: "biology", Citizenship: "citizenship", ICT: "ict",
  Geography: "geography", History: "history", Economics: "economics", HPE: "hpe",
};

function textbookUrl(slug: string) {
  return `${GH_RAW}/public/textbooks/${slug}_grade_9.pdf`;
}

function ministryImageUrl(rel: string) {
  return `${PORTAL_ORIGIN}${rel.startsWith("/") ? rel : "/" + rel}`;
}

async function tg(method: string, body: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res ? await res.json().catch(() => null) : null;
}

function sendMessage(chatId: number | string, text: string, keyboard?: any) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}
function editMessage(chatId: number | string, messageId: number, text: string, keyboard?: any) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}
function answerCb(id: string, text?: string) {
  return tg("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}
function sendPhoto(chatId: number | string, url: string, caption?: string) {
  return tg("sendPhoto", { chat_id: chatId, photo: url, ...(caption ? { caption, parse_mode: "HTML" } : {}) });
}

// ------- Keyboards / views -------
function mainMenuKb() {
  return {
    inline_keyboard: [
      [{ text: "🏫 Schools", callback_data: "sch" }],
      [{ text: "📚 Textbooks (G9)", callback_data: "tb" }],
      [{ text: "🎓 Ministry (G8)", callback_data: "min" }],
    ],
  };
}

async function showMainMenu(chatId: number, messageId?: number) {
  const text = "🎓 <b>Dire Dawa Schools Portal</b>\n\nPick a section:";
  if (messageId) return editMessage(chatId, messageId, text, mainMenuKb());
  return sendMessage(chatId, text, mainMenuKb());
}

async function showSchools(chatId: number, messageId?: number) {
  const schools = await fetchSchools().catch(() => []);
  if (!schools.length) {
    const kb = { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "menu" }]] };
    return editMessage(chatId, messageId!, "No schools available yet.", kb);
  }
  const rows = schools.map((s) => [{ text: `🏫 ${s.name}`, callback_data: `s:${s.slug}` }]);
  rows.push([{ text: "⬅️ Back", callback_data: "menu" }]);
  const kb = { inline_keyboard: rows };
  const text = `<b>Select a school</b> (${schools.length})`;
  if (messageId) return editMessage(chatId, messageId, text, kb);
  return sendMessage(chatId, text, kb);
}

async function showSchool(chatId: number, messageId: number, slug: string) {
  const school = await fetchSchoolBySlug(slug).catch(() => null);
  if (!school) return editMessage(chatId, messageId, "School not found.", { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "sch" }]] });
  const secs = await fetchSections(school.id).catch(() => []);
  const grades = Array.from(new Set(secs.map((s) => s.grade))).sort();
  if (!grades.length) {
    return editMessage(chatId, messageId, `<b>${school.name}</b>\n\nNo grades configured yet.`, {
      inline_keyboard: [[{ text: "⬅️ Schools", callback_data: "sch" }]],
    });
  }
  const rows = grades.map((g) => [{ text: `Grade ${g}`, callback_data: `g:${slug}:${g}` }]);
  rows.push([{ text: "⬅️ Schools", callback_data: "sch" }]);
  return editMessage(chatId, messageId, `<b>${school.name}</b>\nChoose a grade:`, { inline_keyboard: rows });
}

async function showGrade(chatId: number, messageId: number, slug: string, grade: string) {
  const school = await fetchSchoolBySlug(slug).catch(() => null);
  if (!school) return editMessage(chatId, messageId, "School not found.", { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "sch" }]] });
  const secs = (await fetchSections(school.id).catch(() => [])).filter((s) => s.grade === grade);
  const sections = Array.from(new Set(secs.map((s) => s.section))).filter(Boolean).sort();
  if (!sections.length) {
    // No sections — jump straight to students
    return showStudents(chatId, messageId, slug, grade, "", 0);
  }
  const rows = sections.map((sec) => [{ text: `Section ${sec}`, callback_data: `sec:${slug}:${grade}:${sec}:0` }]);
  rows.push([{ text: "⬅️ Back", callback_data: `s:${slug}` }]);
  return editMessage(chatId, messageId, `<b>${school.name}</b> — Grade ${grade}\nChoose a section:`, { inline_keyboard: rows });
}

async function showStudents(chatId: number, messageId: number, slug: string, grade: string, section: string, page: number) {
  const school = await fetchSchoolBySlug(slug).catch(() => null);
  if (!school) return editMessage(chatId, messageId, "School not found.", { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "sch" }]] });
  const students = await fetchStudents(school.id, grade, section || null).catch(() => []);
  if (!students.length) {
    return editMessage(chatId, messageId, "No students found here.", {
      inline_keyboard: [[{ text: "⬅️ Back", callback_data: `g:${slug}:${grade}` }]],
    });
  }
  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const p = Math.min(Math.max(page, 0), totalPages - 1);
  const slice = students.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  const rows = slice.map((st) => [{ text: `👤 ${st.full_name}${st.student_no ? ` · #${st.student_no}` : ""}`, callback_data: `st:${st.id}` }]);
  const nav: any[] = [];
  if (p > 0) nav.push({ text: "◀️", callback_data: `sec:${slug}:${grade}:${section}:${p - 1}` });
  nav.push({ text: `Page ${p + 1}/${totalPages}`, callback_data: "noop" });
  if (p < totalPages - 1) nav.push({ text: "▶️", callback_data: `sec:${slug}:${grade}:${section}:${p + 1}` });
  rows.push(nav);
  rows.push([{ text: "⬅️ Back", callback_data: section ? `g:${slug}:${grade}` : `s:${slug}` }]);
  const header = `<b>${school.name}</b> — Grade ${grade}${section ? ` · Section ${section}` : ""}\n${students.length} student(s)`;
  return editMessage(chatId, messageId, header, { inline_keyboard: rows });
}

async function showStudent(chatId: number, messageId: number, studentId: string) {
  const { data: st } = await manager.from("students").select("*").eq("id", studentId).maybeSingle();
  const s = st as ManagerStudent | null;
  if (!s) return editMessage(chatId, messageId, "Student not found.", { inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu" }]] });
  const lines = [
    `👤 <b>${s.full_name}</b>`,
    s.english_name ? `EN: ${s.english_name}` : "",
    s.student_no ? `Reg No: <code>${s.student_no}</code>` : "",
    s.grade ? `Grade: ${s.grade}${s.section ? ` · Sec ${s.section}` : ""}` : "",
    s.age ? `Age: ${s.age}` : "",
    s.gender ? `Gender: ${s.gender}` : "",
    s.kebele ? `Kebele: ${s.kebele}` : "",
    s.house_no ? `House No: ${s.house_no}` : "",
  ].filter(Boolean).join("\n");
  const kb = {
    inline_keyboard: [
      [{ text: "📄 Report Card", callback_data: `rc:${s.id}` }],
      [{ text: "⬅️ Back", callback_data: s.grade ? `g:${(await backSlug(s.school_id)) ?? ""}:${s.grade}` : "sch" }],
    ],
  };
  if (s.image_url) {
    await sendPhoto(chatId, s.image_url, lines);
    return sendMessage(chatId, "Options:", kb);
  }
  return editMessage(chatId, messageId, lines, kb);
}

async function backSlug(schoolId: string) {
  const { data } = await manager.from("schools").select("slug").eq("id", schoolId).maybeSingle();
  return (data as any)?.slug ?? null;
}

// ------- State helpers -------
async function setState(chatId: number, awaiting: string | null, data: Record<string, any> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("telegram_bot_state").upsert({
    chat_id: chatId, awaiting, data, updated_at: new Date().toISOString(),
  });
}
async function getState(chatId: number): Promise<{ awaiting: string | null; data: any } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("telegram_bot_state").select("awaiting, data").eq("chat_id", chatId).maybeSingle();
  return (data as any) ?? null;
}
async function clearState(chatId: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("telegram_bot_state").delete().eq("chat_id", chatId);
}

// ------- Textbooks / Ministry / Report card -------
async function showTextbooks(chatId: number, messageId: number) {
  const subjects = Object.keys(textbookPageInfo);
  const rows: any[][] = [];
  for (let i = 0; i < subjects.length; i += 2) {
    const pair = subjects.slice(i, i + 2).map((s) => ({ text: `📖 ${s}`, callback_data: `tbs:${SUBJECT_SLUGS[s] ?? s.toLowerCase()}` }));
    rows.push(pair);
  }
  rows.push([{ text: "⬅️ Menu", callback_data: "menu" }]);
  return editMessage(chatId, messageId, "<b>Grade 9 Textbooks</b>\nTap a subject to get the PDF link.", { inline_keyboard: rows });
}
async function sendTextbookLink(chatId: number, slug: string) {
  const subject = Object.entries(SUBJECT_SLUGS).find(([, v]) => v === slug)?.[0] ?? slug;
  const url = textbookUrl(slug);
  return sendMessage(
    chatId,
    `📖 <b>${subject}</b> — Grade 9\n<a href="${url}">Open / Download PDF</a>`,
    { inline_keyboard: [[{ text: "⬅️ Back to textbooks", callback_data: "tb" }]] },
  );
}

async function startMinistry(chatId: number, messageId: number) {
  await setState(chatId, null);
  const kb = {
    inline_keyboard: [
      [{ text: "🔢 By Reg. No", callback_data: "min_id" }],
      [{ text: "🔤 By Name", callback_data: "min_name" }],
      [{ text: "⬅️ Menu", callback_data: "menu" }],
    ],
  };
  return editMessage(chatId, messageId, "<b>Grade 8 Ministry Result</b>\nHow do you want to search?", kb);
}

async function handleMinistrySearch(chatId: number, mode: "id" | "name", term: string) {
  const t = term.trim();
  if (!t) return sendMessage(chatId, "Please send a search term.");
  if (mode === "id") {
    const img = (resultImages as any)[t];
    if (!img) return sendMessage(chatId, "❌ No result for that registration number.");
    const entry = Object.entries(nameToIdMap).find(([, id]) => String(id) === t);
    await clearState(chatId);
    return sendPhoto(chatId, ministryImageUrl(img), `<b>${entry?.[0] ?? "Result"}</b>\nReg No: <code>${t}</code>`);
  }
  const lower = t.toLowerCase();
  const matches = Object.entries(nameToIdMap)
    .filter(([n]) => n.toLowerCase().includes(lower))
    .slice(0, 20)
    .map(([n, id]) => ({ name: n, id: String(id) }));
  if (!matches.length) return sendMessage(chatId, "No student matches that name.");
  if (matches.length === 1) {
    const img = (resultImages as any)[matches[0].id];
    await clearState(chatId);
    if (!img) return sendMessage(chatId, `Found ${matches[0].name} (Reg No ${matches[0].id}) but no result image available.`);
    return sendPhoto(chatId, ministryImageUrl(img), `<b>${matches[0].name}</b>\nReg No: <code>${matches[0].id}</code>`);
  }
  const rows = matches.map((m) => [{ text: `${m.name} · #${m.id}`, callback_data: `minpick:${m.id}` }]);
  rows.push([{ text: "⬅️ Menu", callback_data: "menu" }]);
  return sendMessage(chatId, `Multiple matches (${matches.length}). Which one?`, { inline_keyboard: rows });
}

async function startReportCard(chatId: number, messageId: number, studentId: string) {
  await setState(chatId, "rc_password", { studentId });
  return editMessage(
    chatId, messageId,
    "🔒 <b>Report Card</b>\nSend the report card password for this student.\nSend /cancel to abort.",
  );
}

function formatReportCard(card: ManagerReportCard, studentName: string): string {
  const terms = ["First", "Second", "Third", "Fourth"];
  const subjKeys = card.subjects ? Object.keys(card.subjects) : [];
  const lines: string[] = [];
  lines.push(`📄 <b>Report Card</b> — ${studentName}`);
  if (card.grade) lines.push(`Grade: ${card.grade}${card.section ? ` · Sec ${card.section}` : ""}`);
  if (card.school_year) lines.push(`Year: ${card.school_year}`);
  if (card.teacher_name) lines.push(`Teacher: ${card.teacher_name}`);
  if (subjKeys.length) {
    lines.push("\n<b>Subjects</b>");
    for (const s of subjKeys) {
      const row = card.subjects![s] ?? {};
      const parts = terms.map((t) => `${t[0]}:${row[t] ?? "-"}`).join(" ");
      lines.push(`• ${s} — ${parts}`);
    }
  }
  if (card.days_present || card.days_absent || card.times_tardy) {
    lines.push("\n<b>Attendance</b>");
    for (const t of terms) {
      const p = card.days_present?.[t] ?? "-";
      const a = card.days_absent?.[t] ?? "-";
      const tt = card.times_tardy?.[t] ?? "-";
      lines.push(`${t}: present ${p} · absent ${a} · tardy ${tt}`);
    }
  }
  if (card.remarks) lines.push(`\n<b>Remarks:</b> ${card.remarks}`);
  return lines.join("\n");
}

async function verifyReportCardPassword(chatId: number, studentId: string, password: string) {
  const { data: st } = await manager.from("students").select("full_name").eq("id", studentId).maybeSingle();
  const name = (st as any)?.full_name ?? "Student";
  const card = await fetchReportCardByStudent(studentId).catch(() => null);
  if (!card) {
    await clearState(chatId);
    return sendMessage(chatId, "No report card is available for this student yet.", { inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu" }]] });
  }
  if ((card.card_password ?? "") !== password.trim()) {
    return sendMessage(chatId, "❌ Wrong password. Try again, or send /cancel.");
  }
  await clearState(chatId);
  return sendMessage(chatId, formatReportCard(card, name), { inline_keyboard: [[{ text: "⬅️ Menu", callback_data: "menu" }]] });
}

// ------- Linking check -------
async function isLinked(chatId: number): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("telegram_links")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .eq("linked", true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let update: any;
        try { update = await request.json(); } catch { return new Response("bad", { status: 400 }); }

        try {
          if (update.callback_query) {
            await handleCallback(update.callback_query);
          } else if (update.message ?? update.edited_message) {
            await handleMessage(update.message ?? update.edited_message);
          }
        } catch (err) {
          console.error("[telegram webhook]", err);
        }
        return Response.json({ ok: true });
      },
      GET: async () => new Response("ok"),
    },
  },
});

async function handleMessage(msg: any) {
  const chatId = msg.chat.id as number;
  const text: string = (msg.text ?? "").trim();
  const username: string | undefined = msg.from?.username;
  const firstName: string | undefined = msg.from?.first_name;

  // /cancel
  if (text === "/cancel") {
    await clearState(chatId);
    return sendMessage(chatId, "Cancelled.", mainMenuKb());
  }

  // /start [code]
  const startMatch = text.match(/^\/start(?:\s+(\S+))?/);
  if (startMatch) {
    const code = startMatch[1];
    if (code) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("telegram_links").select("*").eq("link_code", code).maybeSingle();
      if (!row) return sendMessage(chatId, "❌ That code is invalid or expired. Try again from the portal.");
      if (row.linked && row.telegram_chat_id !== chatId) {
        return sendMessage(chatId, "✅ That portal account is already linked to a different Telegram chat.");
      }
      if (!row.linked) {
        await supabaseAdmin.from("telegram_links").update({
          linked: true, telegram_chat_id: chatId,
          telegram_username: username ?? null, telegram_first_name: firstName ?? null,
          linked_at: new Date().toISOString(),
        }).eq("id", row.id);
        await sendMessage(ADMIN_CHAT_ID, `🔔 New Telegram link\nUser: <b>${row.user_email ?? "(no email)"}</b>\nName: ${row.user_name ?? "-"}\nTelegram: @${username ?? "-"} (chat ${chatId})`);
      }
      await sendMessage(chatId, `✅ Linked to <b>${row.user_email ?? "your account"}</b>. You can also browse the portal right here in Telegram.`);
      return showMainMenu(chatId);
    }
    if (!(await isLinked(chatId))) {
      return sendMessage(chatId, "👋 Open the portal at " + PORTAL_ORIGIN + ", copy your <code>/start CODE</code> command, and send it here to connect.");
    }
    return showMainMenu(chatId);
  }

  if (text === "/menu" || text === "/help") {
    if (!(await isLinked(chatId))) return sendMessage(chatId, "Please link your account first via " + PORTAL_ORIGIN);
    await clearState(chatId);
    return showMainMenu(chatId);
  }

  // Stateful text input
  const st = await getState(chatId);
  if (st?.awaiting === "rc_password" && st.data?.studentId) {
    return verifyReportCardPassword(chatId, st.data.studentId, text);
  }
  if (st?.awaiting === "min_id") return handleMinistrySearch(chatId, "id", text);
  if (st?.awaiting === "min_name") return handleMinistrySearch(chatId, "name", text);

  if (!(await isLinked(chatId))) {
    return sendMessage(chatId, "Please link your account first at " + PORTAL_ORIGIN);
  }
  return showMainMenu(chatId);
}

async function handleCallback(cb: any) {
  const chatId = cb.message?.chat?.id as number;
  const messageId = cb.message?.message_id as number;
  const data: string = cb.data ?? "";
  await answerCb(cb.id);

  if (!chatId) return;
  if (data === "noop") return;

  if (!(await isLinked(chatId))) {
    return editMessage(chatId, messageId, "Please link your account first at " + PORTAL_ORIGIN);
  }

  if (data === "menu") { await clearState(chatId); return showMainMenu(chatId, messageId); }
  if (data === "sch") return showSchools(chatId, messageId);
  if (data === "tb") return showTextbooks(chatId, messageId);
  if (data === "min") return startMinistry(chatId, messageId);
  if (data === "min_id") { await setState(chatId, "min_id"); return editMessage(chatId, messageId, "Send the <b>registration number</b> (e.g. 219335).\nSend /cancel to abort."); }
  if (data === "min_name") { await setState(chatId, "min_name"); return editMessage(chatId, messageId, "Send the <b>name</b> to search.\nSend /cancel to abort."); }

  const [tag, ...rest] = data.split(":");
  if (tag === "s") return showSchool(chatId, messageId, rest[0]);
  if (tag === "g") return showGrade(chatId, messageId, rest[0], rest[1]);
  if (tag === "sec") return showStudents(chatId, messageId, rest[0], rest[1], rest[2] ?? "", Number(rest[3] ?? "0"));
  if (tag === "st") return showStudent(chatId, messageId, rest[0]);
  if (tag === "rc") return startReportCard(chatId, messageId, rest[0]);
  if (tag === "tbs") return sendTextbookLink(chatId, rest[0]);
  if (tag === "minpick") {
    const id = rest[0];
    const img = (resultImages as any)[id];
    const entry = Object.entries(nameToIdMap).find(([, v]) => String(v) === id);
    await clearState(chatId);
    if (!img) return sendMessage(chatId, `Found ${entry?.[0] ?? "student"} but no result image.`);
    return sendPhoto(chatId, ministryImageUrl(img), `<b>${entry?.[0] ?? "Result"}</b>\nReg No: <code>${id}</code>`);
  }
}