export const DIRECTIONS = ["easier", "same", "harder", "numbers"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DIRECTION_LABEL: Record<Direction, string> = { easier: "Slightly easier", same: "Same level", harder: "Slightly harder", numbers: "Swap the numbers" };
/** How a remix is named above the question: "Harder remix of question 4f2a". */
export const DIRECTION_BADGE: Record<Direction, string> = { easier: "Easier", same: "Same-level", harder: "Harder", numbers: "New-numbers" };
export const remixDifficulty = (d: number, dir: Direction) => Math.min(3, Math.max(1, d + (dir === "easier" ? -1 : dir === "harder" ? 1 : 0)));

/** Questions with a figure or diagram are never remixed: the model cannot see it. */
export const hasFigure = (q: { passageMd?: string | null; stemMd: string; choices?: unknown }) => /asset:\/\//.test(JSON.stringify([q.passageMd, q.stemMd, q.choices]));
export const canRemixQuestion = (q: Parameters<typeof hasFigure>[0]) => !hasFigure(q);

/** Swapping numbers only makes sense for a math question whose numbers sit in the text, not in a figure. */
export const canSwapNumbers = (q: { section: string; passageMd?: string | null; stemMd: string; choices?: { md: string }[] | null }) =>
  q.section === "math" && /\d/.test(`${q.stemMd} ${q.choices?.map((c) => c.md).join(" ") ?? ""}`) && !hasFigure(q);
