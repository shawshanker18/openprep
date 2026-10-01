// Answer grading (spec 03 §9 grade.ts).
export type Answer = { choice: string } | { accepted: string[] };

function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s+/g, "");
  if (!/^-?(\d+\.?\d*|\.\d+)(\/\d+)?$/.test(t)) return null;
  const [a, b] = t.split("/");
  const v = b === undefined ? Number(a) : Number(a) / Number(b);
  return Number.isFinite(v) ? v : null;
}

export function gradeSpr(input: string, accepted: string[]): boolean {
  const x = parseNum(input);
  if (x === null) return false;
  const digits = input.replace(/[^0-9]/g, "").length;
  return accepted.some((acc) => {
    const v = parseNum(acc);
    if (v === null) return false;
    if (Math.abs(x - v) < 1e-9) return true;
    // SAT rule: a long decimal may be truncated or rounded but must fill the field (>= 4 digits).
    // ponytail: 0.001 tolerance also accepts e.g. 0.334 for 1/3; tighten to a last-digit check if reports come in.
    return !input.includes("/") && digits >= 4 && Math.abs(x - v) < 0.001;
  });
}

export function grade(q: { answer: Answer }, response: string): boolean {
  return "choice" in q.answer ? response === q.answer.choice : gradeSpr(response, q.answer.accepted);
}

/** SPR field rule: 5 chars (6 with leading minus), only 0-9 . / - */
export const isValidSprInput = (s: string) =>
  /^-?[0-9./]*$/.test(s) && s.length <= (s.startsWith("-") ? 6 : 5);
