"use server";

import { redirect } from "next/navigation";
import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { securityReports } from "@/db/schema";
import { text } from "@/lib/text";
import { clientIp } from "@/server/signup";

const MAX_PER_DAY = 5; // per IP

const Report = z.object({
  contact: text().trim().max(200).optional(),
  message: text().trim().min(20).max(5000),
});

/** Security report from /security (no sign-in needed). Stored for the owner; nothing is sent back. */
export async function sendSecurityReport(form: FormData) {
  const p = Report.safeParse({ contact: form.get("contact") || undefined, message: form.get("message") ?? "" });
  if (!p.success) redirect("/security?error=invalid");
  const ip = await clientIp();
  const [{ n }] = (await db.select({ n: count() }).from(securityReports)
    .where(and(eq(securityReports.ip, ip), gte(securityReports.createdAt, new Date(Date.now() - 86_400_000))))) as [{ n: number }];
  if (n >= MAX_PER_DAY) redirect("/security?error=rate");
  await db.insert(securityReports).values({ ip, contact: p.data.contact ?? null, message: p.data.message });
  redirect("/security?sent=1");
}
