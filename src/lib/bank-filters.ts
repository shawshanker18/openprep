// Question bank filters that both the server and the filter form use: parsing, normalising, query strings.
// Kept free of server-only imports so client components can use it.
import { DOMAINS, SKILL_BY_ID, SKILLS, type DomainId, type Section } from "@/content/taxonomy";

export const STATUSES = ["any", "unattempted", "attempted", "missed"] as const;
export type BankStatus = (typeof STATUSES)[number];
export const MAX_SKILLS = 29;
export type BankFilters = {
  q: string;
  subject: Section | null;
  /** Topics (domains). Any of them matches. Empty means every topic in the subject. */
  domains: DomainId[];
  /** Skills. Any of them matches. Empty means every skill in the chosen topics. */
  skills: string[];
  difficulties: (1 | 2 | 3)[];
  status: BankStatus;
  saved: boolean;
  /** Questions in a practice set started from these results. */
  count: number;
  page: number;
};
type Params = Record<string, string | string[] | undefined>;

const one = (sp: Params, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
/** Repeated parameters (one per checkbox) and comma-separated values are both accepted. */
const many = (sp: Params, k: string) => [sp[k] ?? []].flat().filter((v): v is string => typeof v === "string").flatMap((v) => v.split(","));

/**
 * Normalise raw URL parameters. Unknown values are dropped, not guessed at. A skill has to sit under a chosen topic
 * when topics are chosen, and a topic has to belong to the chosen subject.
 */
export function parseBankFilters(sp: Params): BankFilters {
  let subject: Section | null = one(sp, "subject") === "math" ? "math" : one(sp, "subject") === "rw" ? "rw" : null;
  let domains = [...new Set(many(sp, "domain").filter((d): d is DomainId => d in DOMAINS))];
  if (subject) domains = domains.filter((d) => DOMAINS[d].section === subject);
  let skills = [...new Set(many(sp, "skill").filter((id) => SKILL_BY_ID[id]))].slice(0, MAX_SKILLS);
  if (domains.length) skills = skills.filter((id) => domains.includes(SKILL_BY_ID[id]!.domain));
  // Skills alone set the subject when every one of them is in the same subject.
  if (!subject && !domains.length && skills.length) {
    const sections = new Set(skills.map((id) => SKILL_BY_ID[id]!.section));
    if (sections.size === 1) subject = [...sections][0]!;
  }
  // Checkboxes send one parameter per box (difficulties=1&difficulties=2), so join every value before splitting.
  const diffRaw = many(sp, "difficulties").join(",");
  const difficulties = [...new Set(diffRaw.split(",").map(Number).filter((d): d is 1 | 2 | 3 => d === 1 || d === 2 || d === 3))].sort();
  const status = (STATUSES as readonly string[]).includes(one(sp, "status")) ? (one(sp, "status") as BankStatus) : "any";
  const page = Math.min(1000, Math.max(1, Number.parseInt(one(sp, "page"), 10) || 1));
  const count = [10, 20, 30].includes(Number(one(sp, "count"))) ? Number(one(sp, "count")) : 10;
  return {
    q: one(sp, "q").trim().slice(0, 100), subject, domains, skills,
    difficulties: difficulties.length ? difficulties : [1, 2, 3], status, saved: one(sp, "saved") === "1", count, page,
  };
}

/** The skills a "practise these" set covers: the chosen skills, else every skill in the chosen topics or subject. */
export function scopeSkillIds(f: Pick<BankFilters, "subject" | "domains" | "skills">): string[] {
  if (f.skills.length) return f.skills;
  return SKILLS.filter((s) => (!f.domains.length || f.domains.includes(s.domain)) && (!f.subject || s.section === f.subject)).map((s) => s.id);
}

/** The query string that reproduces these filters, for links and for "back to results". Pages are kept out of it. */
export function bankQuery(f: Partial<BankFilters>, opts: { keepPage?: boolean } = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.subject) p.set("subject", f.subject);
  if (f.domains?.length) p.set("domain", f.domains.join(","));
  if (f.skills?.length) p.set("skill", f.skills.join(","));
  if (f.difficulties && f.difficulties.length < 3) p.set("difficulties", f.difficulties.join(","));
  if (f.status && f.status !== "any") p.set("status", f.status);
  if (f.saved) p.set("saved", "1");
  if (f.count && f.count !== 10) p.set("count", String(f.count));
  if (opts.keepPage && f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Escape LIKE wildcards so a search for "100%" or "a_b" matches literally. */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function activeFilterCount(f: BankFilters): number {
  return [f.q, f.subject, f.domains.length ? 1 : null, f.skills.length ? 1 : null, f.difficulties.length < 3 ? 1 : null, f.status !== "any" ? 1 : null, f.saved || null]
    .filter((x) => x !== null && x !== "").length;
}

/** A short, markdown-free preview of the stem. The answer and explanation are never selected here. */
export function previewText(stemMd: string, max = 160): string {
  const plain = stemMd.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, "⋯").replace(/[*_#`>|]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}
