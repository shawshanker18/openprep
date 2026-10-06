import Link from "next/link";
import { DOMAINS, SKILLS, type DomainId } from "@/content/taxonomy";
import { MasteryBar } from "@/components/mastery-bar";
import { requireUser } from "@/server/auth";
import { getSkillSummary } from "@/server/analytics";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress } from "@/db/schema";
import { skillsByPriority } from "@/server/plan";
import { cn } from "@/lib/utils";

export const metadata = { title: "Your skills" };

const STATUS_LABEL = { unknown: "Not measured yet", weak: "Needs work", developing: "Developing", strong: "Strong", mastered: "Mastered" };

export default async function SkillsPage({ searchParams }: PageProps<"/skills">) {
  const sp = await searchParams;
  const byPriority = sp.sort === "priority";
  const { userId, profile } = await requireUser();
  const [{ skills }, [{ lessons }], ranked] = await Promise.all([
    getSkillSummary(userId),
    db.select({ lessons: count() }).from(lessonProgress)
      // Only skill lessons count here (lesson_progress also holds Desmos lessons and Start from scratch skips).
      .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.skillId, SKILLS.map((k) => k.id)))).then((r) => r as [{ lessons: number }]),
    byPriority ? skillsByPriority(userId, profile) : Promise.resolve([]),
  ]);
  const measured = skills.filter((s) => s.status !== "unknown").length;
  const strong = skills.filter((s) => s.status === "strong" || s.status === "mastered").length;
  const tab = (on: boolean) => cn("-mb-px border-b-2 px-3 py-2", on ? "border-primary font-medium" : "border-transparent text-muted-foreground");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Your skills</h1>
        <p className="text-sm text-muted-foreground">
          Syllabus progress: {lessons}/{skills.length} lessons completed · {measured}/{skills.length} skills measured · {strong} strong or mastered
        </p>
      </div>
      <nav className="flex gap-1 border-b text-sm">
        <Link href="/skills" className={tab(!byPriority)}>Syllabus order</Link>
        <Link href="/skills?sort=priority" className={tab(byPriority)}>Recommended order</Link>
      </nav>
      {byPriority ? (<div className="flex flex-col gap-2">
        <ol className="flex flex-col gap-2">
          {ranked.map((r, i) => {
            const s = skills.find((k) => k.id === r.skillId)!;
            return (
              <li key={s.id}>
                <Link href={`/skills/${s.id}`} className="flex flex-col gap-1 rounded-md border p-3 hover:bg-muted">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{i + 1}. {s.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{s.status === "unknown" ? STATUS_LABEL.unknown : `${s.mastery}% · ${STATUS_LABEL[s.status]}`}</span>
                  </div>
                  <MasteryBar pct={s.mastery} measured={s.status !== "unknown"} selfRating={s.selfRating} />
                </Link>
              </li>
            );
          })}
        </ol>
          <p className="text-xs text-muted-foreground">Skills at the top can add the most points toward your target, because they are tested often and you have room to grow. Skills you&apos;ve already mastered sit at the bottom.</p>
      </div>) : (
      <div className="grid gap-8 lg:grid-cols-2">
        {(["math", "rw"] as const).map((section) => (
          <section key={section} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{section === "rw" ? "Reading and Writing" : "Math"}</h2>
            {(Object.keys(DOMAINS) as DomainId[]).filter((d) => DOMAINS[d].section === section).map((d) => (
              <div key={d} className="flex flex-col gap-3 rounded-lg border p-4">
                <h3 className="text-sm font-medium">{DOMAINS[d].name}</h3>
                {skills.filter((s) => s.domain === d).map((s) => (
                  <Link key={s.id} href={`/skills/${s.id}`} className="flex flex-col gap-1 rounded-md p-1 hover:bg-muted">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {s.status === "unknown" ? STATUS_LABEL.unknown : `${s.mastery}% · ${STATUS_LABEL[s.status]}`}
                        {s.pace === "slow" && " · slow"}
                      </span>
                    </div>
                    <MasteryBar pct={s.mastery} measured={s.status !== "unknown"} selfRating={s.selfRating} />
                  </Link>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
      )}
    </div>
  );
}
