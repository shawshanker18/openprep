// Every tunable number in the product lives here (spec 00 §4 rule 5).
export type Difficulty = 1 | 2 | 3;

export const THETA_MIN = -3, THETA_MAX = 3;
export const DIFF_B: Record<Difficulty, number> = { 1: -1.2, 2: 0, 3: 1.2 };
export const GUESS_MCQ = 0.25;
export const K0 = 1.0, K_DECAY = 0.2, K_MIN = 0.2;        // step = max(K_MIN, K0 / (1 + K_DECAY * n))
export const SIBLING_SHARE = 0.5;                          // share of an update passed to thin same-domain skills
export const SIBLING_MAX_N = 3;                            // siblings with >= this many own attempts get nothing
export const GUESSED_CORRECT_WEIGHT = 0.5;
export const REVIEW_WEIGHT = 0.5;
export const SIGMA0 = 1.5, SIGMA_DECAY = 4;                // sigma = SIGMA0 / sqrt(1 + n / SIGMA_DECAY)
export const TARGET_SECONDS = { rw: 71, math: 95 } as const;
export const STATUS = { weak: 45, developing: 70, strong: 85 }; // mastery % thresholds
export const SCORE_SLOPE = 115;                            // section score = 500 + SCORE_SLOPE * sectionTheta
export const REVIEW_INTERVAL_DAYS = [1, 3, 7];
export const MISCONCEPTION_REVIEW_HOURS = 4;               // sure-but-wrong comes back sooner
export const ROUTE_THRESHOLD = { rw: 18, math: 14 } as const;
export const ROUTE_FRACTION = 0.65;                        // used when module 1 is short (thin bank)
export const MOCK_HALF_WIDTH = 30;
export const MAX_ATTEMPT_MS = 10 * 60_000;
export const DIAGNOSTIC_PER_DOMAIN = 3;
export const AI_INPUT_MAX_CHARS = 1000;
