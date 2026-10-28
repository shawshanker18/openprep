"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calculatorLayouts } from "@/db/schema";
import { requireUser } from "@/server/auth";

export type CalculatorLayout = { x: number; y: number; w: number; h: number; tab: "graphing" | "scientific" };

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : null);

/** Read once when a practice, test or diagnostic session first opens its calculator, never per question. */
export async function getCalculatorLayout(): Promise<CalculatorLayout | null> {
  const { userId } = await requireUser();
  const [row] = await db.select({ layout: calculatorLayouts.layout }).from(calculatorLayouts).where(eq(calculatorLayouts.userId, userId));
  return row?.layout ?? null;
}

/** Every press of "Save as default" lands here. */
export async function saveCalculatorLayout(input: CalculatorLayout): Promise<{ ok: boolean }> {
  const { userId } = await requireUser();
  const layout = { x: num(input?.x, 0, 10000), y: num(input?.y, 0, 10000), w: num(input?.w, 200, 10000), h: num(input?.h, 160, 10000), tab: input?.tab === "scientific" ? "scientific" as const : "graphing" as const };
  if (layout.x === null || layout.y === null || layout.w === null || layout.h === null) return { ok: false };
  const value = layout as CalculatorLayout;
  await db.insert(calculatorLayouts).values({ userId, layout: value })
    .onConflictDoUpdate({ target: calculatorLayouts.userId, set: { layout: value, updatedAt: new Date() } });
  return { ok: true };
}
