import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AskInput = z.object({
  subject: z.string().min(1).max(80),
  currentPage: z.number().int().min(1).max(2000).nullable().optional(),
  selection: z.string().max(4000).optional().nullable(),
  context: z.string().max(24000).optional().nullable(),
  question: z.string().min(1).max(2000),
});

export const askTextbook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { answer: "AI is not configured (missing LOVABLE_API_KEY).", error: true as const };

    const gateway = createLovableAiGatewayProvider(key);
    const sys = `You are a helpful Grade 9 tutor answering questions about the "${data.subject}" textbook.
Rules:
- Base your answer on the textbook excerpts below when they are relevant. If they do not contain the answer, say so briefly and answer from general Grade 9 knowledge of ${data.subject}.
- Be concise and clear. Use short paragraphs, bullet lists, and step-by-step reasoning when useful.
- If the student selected text, treat it as the primary thing they are asking about.
- Respond in the same language as the student's question (English or Amharic).`;

    const parts: string[] = [];
    if (data.selection) parts.push(`Student's selected text:\n"""\n${data.selection}\n"""`);
    if (data.context) parts.push(`Textbook excerpt (around page ${data.currentPage ?? "?"}):\n"""\n${data.context}\n"""`);
    parts.push(`Question: ${data.question}`);

    try {
      const { text } = await generateText({
        model: gateway("openai/gpt-5.5"),
        system: sys,
        prompt: parts.join("\n\n"),
      });
      return { answer: text, error: false as const };
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      if (err.statusCode === 429) return { answer: "Too many requests — please wait a moment and try again.", error: true as const };
      if (err.statusCode === 402) return { answer: "AI credits exhausted. Ask the admin to top up the workspace.", error: true as const };
      return { answer: `AI error: ${err.message ?? "unknown"}`, error: true as const };
    }
  });