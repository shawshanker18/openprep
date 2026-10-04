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
    // Accept only the actual rounded or truncated representation at the entered decimal precision.
    // A broad tolerance incorrectly accepted nearby answers, e.g. 0.334 for 1/3.
    if(input.includes('/') || digits<4 || !input.includes('.')) return false;
    const places=input.split('.')[1]!.length,scale=10**places;
    const truncated=Math.trunc(v*scale)/scale;
    const rounded=Math.sign(v)*Math.round(Math.abs(v)*scale)/scale;
    return Math.abs(x-truncated)<1e-9 || Math.abs(x-rounded)<1e-9;
  });
}

export function grade(q: { answer: Answer }, response: string): boolean {
  return "choice" in q.answer ? response === q.answer.choice : gradeSpr(response, q.answer.accepted);
}

/** SPR field rule: 5 chars (6 with leading minus), only 0-9 . / - */
export const isValidSprInput = (s: string) =>
  /^-?[0-9./]*$/.test(s) && s.length <= (s.startsWith("-") ? 6 : 5);
