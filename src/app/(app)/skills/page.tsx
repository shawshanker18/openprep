import Link from "next/link";
import { DOMAINS, type DomainId } from "@/content/taxonomy";
import { MasteryBar } from "@/components/mastery-bar";
import { requireUser } from "@/server/auth";
import { getSkillSummary } from "@/server/analytics";

const STATUS_LABEL = { unknown: "Not measured yet", weak: "Needs work", developing: "Developing", strong: "Strong", mastered: "Mastered" };

export default async function SkillsPage() {
  const { userId } = await requireUser();
  const { skills } = await getSkillSummary(userId);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Skills</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        {(["rw", "math"] as const).map((section) => (
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
    </div>
  );
}
