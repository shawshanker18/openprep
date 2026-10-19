import Link from "next/link";
import { DOMAINS, type DomainId } from "@/content/taxonomy";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/mastery-bar";
import { requireUser } from "@/server/auth";
import { guarded } from "@/server/guard";
import { getProgress, getSkillSummary } from "@/server/analytics";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const { userId, profile } = await requireUser();
  const [p, { skills }] = await guarded(Promise.all([getProgress(userId, profile.timezone), getSkillSummary(userId)]));

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Progress</h1>
      {(
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Official SAT scores</h2>
          <Button variant="outline" size="sm" className="self-start" render={<Link href="/settings#scores" />}>Add your official SAT result</Button>
          <p className="text-xs text-muted-foreground">Your scores stay private to your account.</p>
          <ul className="text-sm tabular-nums">{p.official.map((o) => <li key={o.id}>{o.takenOn}: {o.math + o.rw} (Math {o.math}, R&amp;W {o.rw})</li>)}</ul>
          {p.superscore && <p className="text-sm">Superscore: <b>{p.superscore.total}</b> (Math {p.superscore.math} + R&amp;W {p.superscore.rw})</p>}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Mastery by domain</h2>
        {(Object.keys(DOMAINS) as DomainId[]).sort((a,b)=>Number(DOMAINS[a].section!=="math")-Number(DOMAINS[b].section!=="math")).map((d) => {
          const ks = skills.filter((s) => s.domain === d && s.status !== "unknown");
          const avg = ks.length ? Math.round(ks.reduce((a, s) => a + s.mastery, 0) / ks.length) : 0;
          return (
            <div key={d} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
              <span>{DOMAINS[d].name}</span><MasteryBar pct={avg} measured={ks.length > 0} />
              <span className="text-right tabular-nums text-muted-foreground">{ks.length ? `${avg}%` : "Not yet"}</span>
            </div>
          );
        })}
      </section>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3"><h2 className="font-medium">Review your work</h2>
          <div className="flex flex-wrap gap-2">
            {([["/mistakes", "Recent mistakes"], ["/skills", "Skills"], ["/tests#history", "Test history"], ["/practice/sessions", "Practice history"], ["/bookmarks", "Saved questions"]] as const).map(([href, label]) => (
              <Button key={href} variant="outline" render={<Link href={href} />}>{label}</Button>
            ))}
          </div></section>

      </div>
    </div>
  );
}
