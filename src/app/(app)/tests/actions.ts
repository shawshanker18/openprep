"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { SKILL_BY_ID } from "@/content/taxonomy";
import { diagnosticPending, requireUser } from "@/server/auth";
import { ensureWeeklyFocus } from "@/server/plan";
import { startTest } from "@/server/tests";

const skill = z.string().refine((s) => !!SKILL_BY_ID[s]);
const Start = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("full") }),
  z.object({ kind: z.literal("section"), section: z.enum(["rw", "math"]) }),
  z.object({ kind: z.literal("module"), section: z.enum(["rw", "math"]) }),
  z.object({ kind: z.literal("mini"), skillId: skill }),
  z.object({ kind: z.literal("weakness") }),
  z.object({ kind: z.literal("custom"), skillIds: z.array(skill).min(1).max(29), count: z.coerce.number().int().min(5).max(30), timed: z.boolean() }),
]);

export async function startTestAction(form: FormData) {
  const { userId, profile } = await requireUser();
  if (diagnosticPending(profile)) redirect("/dashboard");
  const raw = Object.fromEntries(form);
  const p = Start.safeParse({ ...raw, skillIds: form.getAll("skillIds"), timed: form.get("timed") === "on" });
  if (!p.success) redirect("/tests?error=invalid");
  const focus = p.data.kind === "weakness" ? await ensureWeeklyFocus(userId, profile) : undefined;
  const r = await startTest(userId, { ...p.data, focus });
  if (!r.ok) redirect(r.resumeId ? `/tests?resume=${r.resumeId}` : "/tests?error=empty");
  redirect(`/test/${r.id}`);
}
