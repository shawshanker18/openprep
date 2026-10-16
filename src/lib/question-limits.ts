/**
 * How many questions one practice set or test may hold. One place for the limit, used by the question-bank picker,
 * the practice page, the session store and the test builder, so the screens and the server cannot disagree.
 */
export const MAX_QUESTIONS_PER_SET = 50;
/** Sizes offered when a student builds a set in the question bank (the first is the default). */
export const SET_SIZES = [10, 20, 30, 40, 50] as const;
/** Sizes the server accepts for a question-bank set (5 stays valid for links from lessons). */
export const ACCEPTED_SET_SIZES: readonly number[] = [2, 5, ...SET_SIZES];
export const clampSetSize = (n: number) => Math.min(MAX_QUESTIONS_PER_SET, Math.max(1, Math.trunc(n) || 1));
