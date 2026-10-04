// AI tutor endpoint (spec 04 §8.3). Plain-text streaming; the client reads it with fetch.
import { after } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { text as safeText } from "@/lib/text";
import { AI_INPUT_MAX_CHARS } from "@/engine/constants";
import { getUserId } from "@/server/auth";
import { cacheKey, checkAccess, getCached, getModel, loadQuestion, logMessage, MODES, saveCache, systemPrompt, usedToday } from "@/server/ai";
import { db } from "@/db";
import { internalId } from "@/server/questions";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const Body = z.object({
  questionId: safeText().min(1).max(64),
  mode: z.enum(MODES),
  choice: z.enum(["A", "B", "C", "D"]).optional(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: safeText().min(1).max(4000) })).max(20).default([]),
});

const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Whether a tutor model is configured, so the UI can hide the tutor instead of showing a dead button. */
export function GET() {
  return Response.json({ enabled: !!getModel() }, { headers: { "cache-control": "public, max-age=300" } });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return text("Please sign in.", 401);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return text("Invalid request.", 400);
  const { questionId, mode, choice, messages } = p.data;
  const lastUser = messages.findLast((m) => m.role === "user");
  if (mode === "chat" && !lastUser) return text("Ask a question first.", 400);
  if (lastUser && lastUser.content.length > AI_INPUT_MAX_CHARS) return text(`Please keep questions under ${AI_INPUT_MAX_CHARS} characters.`, 400);
  if (mode === "why_wrong" && !choice) return text("Which choice did you pick?", 400);

  const internal = await internalId(questionId);
  const q = internal ? await loadQuestion(internal) : null;
  if (!q) return text("Question not found.", 404);
  if (mode === "vocab" && q.section !== "rw") return text("Vocabulary help is for Reading & Writing questions.", 400);
  const denied = await checkAccess(userId, q, mode);
  if (denied) return text(denied, 403);

  // similar: fresh question every click — never cached, never stored as a real question.
  const key = mode === "chat" || mode === "similar" ? null : cacheKey(q, mode, choice);
  if (key) {
    const hit = await getCached(key);
    if (hit) return text(hit);
  }

  const model = getModel();
  if (!model) return text("The tutor isn't set up on this server yet. You can still review the correct answer.", 503);
  const [profile] = await db.select({ tz: profiles.timezone }).from(profiles).where(eq(profiles.id, userId));
  const limit = Number(process.env.AI_DAILY_LIMIT) || 30;
  if ((await usedToday(userId, profile?.tz ?? "UTC")) >= limit)
    return text("You've used today's tutor questions. You can still review the correct answer and any included explanation.", 429);

  const prompt = mode === "chat" ? lastUser!.content : `Help me with this question (${mode}).`;
  await logMessage(userId, q.id, "user", prompt);

  const result = streamText({
    model,
    instructions: await systemPrompt(userId, q, mode, choice),
    messages: mode === "chat" ? messages.slice(-8) : [{ role: "user", content: prompt }],
    maxOutputTokens: mode === "similar" ? 1000 : 700,
  });
  after(async () => {
    const out = await result.text;
    if (!out) return;
    await logMessage(userId, q.id, "assistant", out);
    if (key) await saveCache(key, out);
  });
  return result.toTextStreamResponse();
}
