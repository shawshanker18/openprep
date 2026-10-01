# Writing OpenPrep content

**All content must be original.** Never copy or paraphrase College Board, Khan Academy, Bluebook, or prep-book
questions or passages. Public-domain texts (pre-1929 literature, government publications) may be used for R&W
passages — add a `"source"` field.

## Files

- `questions/<skill-id>.json` — a JSON array of questions for one skill. Skill IDs are in `src/content/taxonomy.ts`.
- `lessons/<skill-id>.md` — one lesson per skill, with exactly these `##` headings, in order:
  What this skill is · Key ideas · Formulas and rules · Worked example 1 (easy) · Worked example 2 (SAT-level) ·
  Common traps · The fast way (and when to use Desmos). 400–900 words.
- `figures/<question-id>.svg` — referenced as `![alt text](/figures/<question-id>.svg)`.

Run `npm run content:validate` before opening a PR.

## Question rules

| Field | Rule |
|---|---|
| `id` | `<skill-id>-NNNN`. Never reuse or renumber an id. To remove a question, delete it from the file (it is retired, not deleted). |
| `difficulty` | 1 easy (one step, > 75% of average students right) · 2 medium (two steps or unfamiliar wrapper, 45–75%) · 3 hard (multi-step, traps, < 45%) |
| `type` | `mcq` or `spr` (student-produced response, math only) |
| `passage` | Required for R&W (25–150 words). |
| `choices` / `answer` | MCQ: 4 distinct choices, answer `"A"`–`"D"`. SPR: array of accepted values as decimals or fractions, e.g. `["2/3"]`. Don't list rounded forms — the grader accepts them. |
| `rationales` | MCQ: one entry for each **wrong** letter, naming the specific mistake that leads to it. |
| `explanation` | The by-hand method, step by step. ≥ 40 characters. |
| `fastMethod`, `desmos` | Optional. If `desmos` is present, add the `desmos` tag (and vice versa). |
| `tags` | 3–8 kebab-case sub-skill tags per skill; keep the vocabulary consistent with the lesson's frontmatter. |
| `version` | Bump when the answer or meaning changes (invalidates cached AI explanations). Typos don't need a bump. |

**Markdown:** `$…$` for inline math, `$$…$$` for display math. Write a literal dollar sign as `\$` (in JSON: `"\\$5"`),
otherwise it is parsed as math. No raw HTML.

## The pipeline (per skill × difficulty batch)

1. **Draft** with any LLM using the prompt below.
2. **Blind re-solve:** a *separate* model call gets each question without the answer or explanation and solves it.
   Any mismatch → discard the question (don't "fix" it). For R&W, also ask: "Is more than one choice defensible?
   If so, say AMBIGUOUS." → discard.
3. **Human review** of every surviving question against the checklist. Not optional.
4. `npm run content:validate`, then open a PR.

**Review checklist:** exactly one defensible answer · each wrong choice is plausible and maps to a real error ·
R&W needs no outside knowledge · numbers are clean · difficulty label is right · wording matches SAT style ·
no sensitive topics · renders correctly.

## Draft prompt

```
You are writing ORIGINAL practice questions in the style of the Digital SAT.
Skill: {skill name} — {one-line skill description}
Difficulty: {1|2|3} — {definition above}
Sub-skill tags to spread across: {tags}
Write 10 questions as a JSON array in exactly this schema: {paste one example from questions/}
Rules:
- Do not reproduce any existing published question or passage. Invent new contexts.
- Exactly one correct answer. Each wrong choice must come from a specific, named mistake;
  put that mistake in "rationales".
- Math: all numbers must work out exactly; vary which letter is correct.
- R&W: write a fresh 25–150 word passage per question; vary subject area
  (science, history/social studies, humanities, literature).
- "explanation" shows the by-hand method step by step.
- Add "desmos" only when graphing is genuinely a faster route.
- Write literal dollar signs as \$.
```
