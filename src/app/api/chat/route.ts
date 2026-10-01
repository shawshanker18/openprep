// AI tutor endpoint (spec 04 §8.3). Plain-text streaming; the client reads it with fetch.
import { after } from "next/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { AI_INPUT_MAX_CHARS } from "@/engine/constants";
import { getUserId } from "@/server/auth";
import { cacheKey, checkAccess, getCached, loadQuestion, logMessage, MODES, saveCache, systemPrompt, usedToday } from "@/server/ai";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const Body = z.object({
  questionId: z.string().min(1).max(64),
  mode: z.enum(MODES),
  choice: z.enum(["A", "B", "C", "D"]).optional(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).max(20).default([]),
});

const text = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

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

  const q = await loadQuestion(questionId);
  if (!q) return text("Question not found.", 404);
  const denied = await checkAccess(userId, q, mode);
  if (denied) return text(denied, 403);

  const key = mode === "chat" ? null : cacheKey(q, mode, choice);
  if (key) {
    const hit = await getCached(key);
    if (hit) return text(hit);
  }

  if (!process.env.ANTHROPIC_API_KEY) return text("The tutor isn't set up on this server yet. The written explanations are always available.", 503);
  const [profile] = await db.select({ tz: profiles.timezone }).from(profiles).where(eq(profiles.id, userId));
  const limit = Number(process.env.AI_DAILY_LIMIT) || 30;
  if ((await usedToday(userId, profile?.tz ?? "UTC")) >= limit)
    return text("You've used today's tutor questions — the written explanations and methods are always available.", 429);

  const prompt = mode === "chat" ? lastUser!.content : `Help me with this question (${mode}).`;
  await logMessage(userId, q.id, "user", prompt);

  const result = streamText({
    model: anthropic(process.env.AI_MODEL || "claude-haiku-4-5-20251001"),
    instructions: await systemPrompt(userId, q, mode, choice),
    messages: mode === "chat" ? messages.slice(-8) : [{ role: "user", content: prompt }],
    maxOutputTokens: 700,
  });
  after(async () => {
    const out = await result.text;
    if (!out) return;
    await logMessage(userId, q.id, "assistant", out);
    if (key) await saveCache(key, out);
  });
  return result.toTextStreamResponse();
}
