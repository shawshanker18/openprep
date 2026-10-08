import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { SKILL_BY_ID, SKILLS, DOMAINS, shortSkillName } from "@/content/taxonomy";
import { getLesson, lessonExists } from "@/server/lessons";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";

export async function generateStaticParams() {
  const ids = await Promise.all(SKILLS.map(async (k) => ((await lessonExists(k.id)) ? k.id : null)));
  return ids.filter((id): id is string => !!id).map((skillId) => ({ skillId }));
}
export const dynamicParams = false;

const plain = (md: string) => md.replace(/\$[^$]*\$/g, "").replace(/[*_`>#|-]/g, "").replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: PageProps<"/learn/[skillId]">): Promise<Metadata> {
  const { skillId } = await params;
  const skill = SKILL_BY_ID[skillId];
  const lesson = skill ? await getLesson(skillId) : null;
  if (!skill || !lesson) return {};
  const name = shortSkillName(skill.name);
  const intro = plain(lesson.sections[0]?.md ?? "").slice(0, 150);
  return {
    title: `SAT ${name}: free lesson, examples and tips`,
    description: `${intro}${intro.endsWith(".") ? "" : "…"} Free SAT lesson from OpenPrep.`.slice(0, 300),
    alternates: { canonical: `/learn/${skillId}` },
  };
}

export default async function LessonPage({ params }: PageProps<"/learn/[skillId]">) {
  const { skillId } = await params;
  const skill = SKILL_BY_ID[skillId];
  const lesson = skill ? await getLesson(skillId) : null;
  if (!skill || !lesson) notFound();
  const name = shortSkillName(skill.name);
  const domain = DOMAINS[skill.domain];
  const ld = {
    "@context": "https://schema.org", "@type": "Article", headline: `SAT ${name}: free lesson`, inLanguage: "en", isAccessibleForFree: true,
    about: `${skill.section === "math" ? "SAT Math" : "SAT Reading and Writing"}: ${domain.name}`,
    author: { "@type": "Organization", name: "OpenPrep" }, publisher: { "@type": "Organization", name: "OpenPrep", logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` } },
    mainEntityOfPage: `${SITE}/learn/${skillId}`,
  };
  return (<>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\u003c") }} />
    <p className="text-sm text-muted-foreground"><Link href="/learn" className="underline">All SAT lessons</Link> · {skill.section === "math" ? "SAT Math" : "SAT Reading and Writing"} · {domain.name}</p>
    <h1>SAT {name}</h1>
    {lesson.minutes && <p className="text-sm text-muted-foreground">About {lesson.minutes} minutes</p>}
    {lesson.sections.map((s) => (
      <section key={s.heading} className="flex flex-col gap-2">
        <h2>{s.heading.replace(/\((easy|medium|hard)\)/gi, "").trim()}</h2>
        <Markdown>{s.md}</Markdown>
      </section>
    ))}
    <div className="mt-6 rounded-xl border p-5">
      <p className="font-medium">Practice {name} for free</p>
      <p className="text-sm text-muted-foreground">OpenPrep adapts the questions to your level, tracks your progress and builds a study plan. No subscription.</p>
      <Link href="/login" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Start practicing free</Link>
    </div>
  </>);
}
