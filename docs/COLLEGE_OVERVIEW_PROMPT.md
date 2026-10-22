# College Overview: master build prompt

Use this document as the full brief for building the College Overview feature in the OpenPrep repo. It is written to be handed to a coding agent as-is.

---

## The prompt

You are building a new feature for OpenPrep, a free SAT prep platform for CBSE students (Next.js App Router, React 19, TypeScript, Tailwind, Base UI components in `src/components/ui`, Supabase + Drizzle for user data, curated static content in `src/content/*.ts`, pure deterministic engines in `src/engine/*.ts`, vitest tests colocated as `*.test.ts`). Before writing any code:

- Read `AGENTS.md` at the repo root. This Next.js version may differ from what you know: read the relevant guide under `node_modules/next/dist/docs/` before touching App Router APIs.
- Read `docs/PROJECT_SUMMARY.md` for product voice and conventions, `src/content/cbse-chapters.ts` and `src/engine/assignment.ts` as the style reference for content files and pure engines, and `src/app/(static)/cbse-sat-prep/page.tsx` for how public marketing pages are structured.
- Match the existing code style exactly: no author headers, no emoji, no em dashes, minimal comments that explain behavior rather than deliberation, Tailwind utility classes matching nearby components.

### 1. What you are building

"College Overview" at `/colleges`: an interactive world map showing where the student can go to university for engineering (engineering only in this version; the data model must make adding other courses later a content change, not a code change).

The page asks, in a short stepped wizard:

1. Country of citizenship, and separately any country of permanent residency (PR).
2. What kind of admissions they want: holistic, entrance-test based, grades/predicted-marks based, standardized-test (SAT/ACT) based. Multi-select.
3. Their school curriculum (reuse the existing curriculum enum: cbse, icse, ib, gcse, american, other) and their predicted or board marks as a percentage (0-100).
4. Their SAT scores (total; optional math and R&W breakdowns; allow "not taken yet").
5. Their budget: one number in USD per year, meant to cover tuition plus living costs, with a slider and a text field.

A left panel keeps all of these as live filters after the wizard finishes. The world map updates instantly as anything changes: every selected or typed change re-evaluates client-side. No server round trip per keystroke. The map highlights countries with a verdict:

- **Competitive** (primary color): the student comfortably clears a route's requirements.
- **Eligible** (primary at reduced opacity): requirements met at the margin.
- **Stretch** (amber): below the typical admitted range but the route is not closed.
- **Not highlighted** (gray, like all other countries): no route matches the filters or hard requirements fail.
- Hovering shows the country name and one-line verdict; clicking opens a country card (below or beside the map) with details: which route matched, why, what to improve, cost breakdown, and sources.

The citizenship/PR answers change which route applies inside a country: the citizenship or PR country uses its domestic route (for example India's entrance-test route for Indian citizens), every other country uses its international route. PR in a country means that country also counts as domestic for fees and admission routes.

### 2. Data model, in `src/content/college-courses.ts` and `src/content/college-countries.ts`

Typed, curated, hand-reviewed content. Every field must carry real, sourced information; no filler.

```ts
export type AdmissionType = "holistic" | "entrance-test" | "grades" | "standardized";
export type SatPolicy = "required" | "optional" | "accepted" | "not-used";

export type CountryRoute = {
  audience: "domestic" | "international";
  admissionType: AdmissionType;
  sat: { policy: SatPolicy; typical?: [number, number] };      // typical admitted total range, e.g. [1350, 1540]
  predictedPct?: { min: number; competitive: number };        // board/predicted % thresholds for grades routes
  entranceTests?: string[];                                     // e.g. ["JEE Main", "JEE Advanced"]
  language?: string[];                                          // e.g. ["English (IELTS 6.5 typical)"]
  cost: { tuition: [number, number]; living: [number, number] }; // USD per year
  notes: string;                                                 // 1-3 sentences, factual, specific
  sources: string[];                                             // URLs to official pages
};

export type CountryEntry = {
  id: string;            // lowercase slug, e.g. "united-states"
  name: string;
  isoA3: string;         // "USA"; joins the map geometry
  region: string;        // e.g. "North America"
  courses: string[];     // ["engineering"] for now
  routes: CountryRoute[]; // at least one international route; domestic where it exists
};

export const COURSES: { id: string; label: string }[] = [{ id: "engineering", label: "Engineering" }];
```

Scope the roster to these countries in v1: India, United States, United Kingdom, Canada, Australia, Germany, Netherlands, Ireland, France, Italy, Spain, Sweden, Denmark, Norway, Finland, Switzerland, Singapore, Hong Kong, Japan, South Korea, Malaysia, UAE, Qatar, Saudi Arabia, Turkey, Israel, New Zealand, Russia, China. If a country has no realistic engineering route for an international CBSE student, say so in `notes` rather than inventing thresholds.

Data rules:

- Every threshold must come from an official source (university admission pages, education ministry pages, UCAS, DAAD, College Board concordance); list the URLs in `sources`.
- Where a requirement is genuinely "varies by university", encode the typical band honestly and say so in `notes`. Never imply a guarantee of admission.
- Include the page disclaimer in the UI, not the data: "Guidance only, verify with each university. Requirements change every cycle."

### 3. Eligibility engine, in `src/engine/college-eligibility.ts`

Pure and deterministic, exactly like `assignment.ts`: no imports of the database, no React, no filesystem. It receives the input and the country list and returns verdicts. Unit-test every rule in `college-eligibility.test.ts`.

```ts
export type CollegeInput = {
  citizenship: string;            // country id
  pr: string | null;             // country id
  courses: string[];             // from the course filter
  admissionTypes: AdmissionType[];
  curriculum: string | null;
  predictedPct: number | null;    // 0-100
  satTotal: number | null;       // null = not taken
  budgetPerYear: number | null;   // USD
};

export type VerdictStatus = "competitive" | "eligible" | "stretch" | "ineligible";
export type CountryVerdict = { countryId: string; status: VerdictStatus | "hidden"; route: CountryRoute | null; reasons: string[] };

export function evaluateColleges(input: CollegeInput, countries: readonly CountryEntry[]): CountryVerdict[];
```

Rules:

- A country participates only if its `courses` intersect the selected courses. Otherwise `hidden`.
- The domestic route applies when the country is the citizenship or PR country; otherwise international routes only. If a country has no matching route, `hidden`.
- If the student filtered by admission types, only routes of those types are considered; a country whose routes are all filtered out is `hidden`.
- SAT: `required` and no score, or a score below `typical[0] - buffer`, pushes toward `stretch` or `ineligible` (required below range) versus `eligible/competitive` (inside or above range). `optional`/`accepted` never block, but a strong score upgrades the verdict. `not-used` ignores SAT entirely.
- Predicted marks: grades routes use `predictedPct`; below `min` is `ineligible` for that route, between `min` and `competitive` is `eligible`, above is `competitive`. If the student has no predicted yet, grades routes are `eligible` at best, never `competitive`.
- Budget: if the student's budget is below the route's `tuition[0] + living[0]` (cheapest year), the route is `ineligible` with a reason naming the gap; within the range is `eligible`; above `tuition[1] + living[1]` is `competitive` on cost.
- The best matching route wins per country. `reasons` are short student-facing sentences explaining the verdict and what would improve it ("SAT 1280 is below the typical 1350-1540 band for these programs"), with numbers interpolated. No emoji, no filler.
- Tie everything to the same input: identical input, identical output, order-independent. Test that.

### 4. Map component, in `src/components/college-map.tsx` and `src/components/college-overview.tsx`

- New dev dependencies: `d3-geo`, `topojson-client`, `world-atlas`. Copy `countries-110m.json` from `world-atlas` into `public/map/countries-110m.json` at a commit-time script or directly, so the app never fetches external geography at runtime. Do not add any external map service (no Mapbox, no Google Maps, no tiles).
- A client component renders an SVG world map with `geoEquirectangular` (or `geoNaturalEarth1`), one `<path>` per country, using `isoA3` to join the geometry to `CountryEntry`. Countries not in the roster render in a muted gray and are not interactive.
- Fill by verdict status as in section 1. Add a small legend. Hover shows a tooltip (name + one-line verdict). Click selects the country and opens the detail card. Every interactive element is reachable by keyboard: give each path a `role` and accessible name, and mirror the map with the country list (below) so keyboard and screen-reader users get the same information without the SVG.
- The wizard and the left panel live in `college-overview.tsx`: a `CoursePanel` (checkbox list from `COURSES`, only Engineering), admission-type checkboxes, curriculum select reusing the existing curriculum options, predicted % field, SAT fields with a "not taken" state, budget slider + number field, citizenship and PR selects. All state is local `useState`; every change recomputes `evaluateColleges` synchronously. The wizard is just the same panel presented as steps: steps 1-5 from section 1, with the map visible from step 1 onward and a "Skip, just explore" option that leaves defaults. After the last step the panel stays, editable.
- Signed-in students: prefill curriculum and SAT from their profile and official score history on the server, passed as initial props; guests get defaults (curriculum "cbse", no SAT). Never block browsing on missing answers: missing inputs simply narrow nothing.

### 5. Pages and integration

- `src/app/(static)/colleges/page.tsx`: the page, in the marketing shell the other `(static)` pages use, with metadata (title "College Overview: where you can study engineering", description in the site's plain voice) and the disclaimer from section 2 above the map. It is public; it must be crawlable (add `/colleges` to the allow list in `src/app/robots.ts`).
- Link the page from the marketing nav (where `/about` and `/learn` are linked) and from the signed-in app nav (`src/components/app-nav.tsx`), matching the existing item style. Add it to the guest site's `titles` map in `src/app/guest/[...path]/page.tsx` only if that fits the existing guest menu cleanly; otherwise leave the guest nav alone and note it.
- Mobile: the panel stacks above the map, the map stays at least 320px tall, the wizard steps work on a phone. Test the layouts at 375px, 768px, 1280px.
- Do not add database tables, migrations, or server actions in this version. If storing the student's college answers is wanted later, that is a separate change.

### 6. Validation and definition of done

- `npx tsc --noEmit` and `npx eslint` pass on all new files.
- `college-eligibility.test.ts` covers: domestic vs international route selection via citizenship and PR, each SAT policy, grades thresholds, budget bands, admission-type filtering, hidden countries, order independence, and the reason strings.
- Extend `scripts/content-validate.ts` to check the country content: unique ids, valid isoA3 joins against the map geometry file, every country has at least one international route, cost ranges are ordered low-to-high, sources are non-empty URLs. `npm run content:validate` must pass.
- `npx next build` passes.
- Acceptance walkthrough, by hand: open `/colleges`, run the wizard as an Indian citizen (no PR), CBSE, 92% predicted, SAT 1450, budget 25000 USD per year, all admission types on; the map highlights with a mix of statuses; switch admission types to grades-only and holistic-only countries disappear; set SAT to "not taken" and SAT-dependent verdicts downgrade with reasons; raise budget to 60000 and more countries highlight; click Germany and the card shows route, costs, and sources.
- Content voice: factual, plain, warm, no marketing adjectives, no dashes as punctuation, no emoji anywhere.

Deliver the feature in this order: content files and engine with tests first, map rendering second, panel and wizard third, page and nav integration fourth, content validation and the walkthrough last. Commit each milestone separately with a short imperative message.
