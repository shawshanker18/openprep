import { z } from "zod";
import { SKILLS, SUBJECTS, TOPICS } from "@/content/taxonomy";
import { isSatDate } from "./sat-dates";

const sectionScore = z.number().int().min(200).max(800).multipleOf(10);
export const Survey = z.object({
  grade: z.number().int().min(8).max(13).nullable(),
  curriculum: z.enum(["cbse", "icse", "ib", "gcse", "american", "other"]).nullable(),
  topicsStudied: z.array(z.enum(TOPICS.map((t) => t.id) as [string, ...string[]])),
  subjects: z.array(z.enum(SUBJECTS)).default([]),
  englishBackground: z.enum(["first_language", "fluent", "learning"]).nullable(),
  prior: z.object({ math: sectionScore, rw: sectionScore, takenOn: z.iso.date() }).nullable(),
  targetScore: z.number().int().min(400).max(1600).multipleOf(10).nullable(),
  testDate: z.iso.date().refine(isSatDate, "Choose an official SAT date").nullable(),
  minutesPerDay: z.number().refine((n) => [15, 30, 45, 60, 90, 120].includes(n)),
  daysPerWeek: z.number().int().min(3).max(7),
  timezone: z.string().refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }),
  ratings: z.partialRecord(z.enum(SKILLS.map((s) => s.id) as [string, ...string[]]), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).nullable()).default({}),
});
