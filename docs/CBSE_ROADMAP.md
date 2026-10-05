# OpenPrep: a CBSE-first learning plan

Prepared 5 October 2026. Proposal; the CBSE features below are not yet implemented.

## Product direction

Make the existing SAT-prep product easy for CBSE students to enter through familiar school chapters. Start with Mathematics and English for Classes 10–12, then add Class 9 with its own verified syllabus mapping. A student should be able to open a chapter they recognise, learn a concept, answer a few questions and understand every mistake without taking a diagnostic.

This plan assumes OpenPrep remains SAT preparation adapted for CBSE learners. Full CBSE board-exam preparation would need an additional assessment system, content bank and marking rubrics. Keep board marks and SAT estimates separate so neither is presented as the other.

## Immediate repairs in this change

- Onboarding has three slides: school details; optional English background; target SAT score, date and study schedule. The Maths/“what do you already know?” slide is removed. Back and Skip work on every relevant slide; answers remain when navigating back.
- Completing setup goes straight to the dashboard. All skipped personal fields remain unset. Skipping study goals uses the displayed starting schedule of 45 minutes per day, 5 days per week.
- The question bank, Smart Practice, custom practice, tests, course and daily plan no longer require a diagnostic. An optional starting-point check remains available.
- Skill records are created during onboarding so the first practice answer can update mastery safely.
- Optional diagnostic reminders no longer suppress due-review and test notifications. First-mock reminders can start from the first practice answer even without a diagnostic.
- Fresh installations receive the missing practice rate-limit table through migration 0012. Previously, applying all migrations still left practice returning a temporary-unavailability error unless a separate SQL script had been run. Existing projects with the table are supported too.
- The dashboard shows “Not measured yet” before any real answers instead of presenting a default model score as the student's current score. Predicted scores and suggested test timing also wait for evidence.

## Build in this order

| Order | Deliverable | What the student gets | Release check |
| --- | --- | --- | --- |
| 1 | Reliable learning content | Worked explanations, correct diagrams and clear answer feedback | Every question offered in the pilot has a reviewed solution and usable assets |
| 2 | A versioned CBSE chapter map | Browse by class, subject and familiar chapter instead of SAT domain names | Every published mapping cites its syllabus year and has teacher review |
| 3 | School-to-SAT bridge lessons | Familiar method, then the SAT twist, then practice | Students can finish one complete chapter journey on a phone |
| 4 | A chapter-first question bank | Chapter, concept, difficulty and question-type filters | No irrelevant questions silently enter a selected chapter |
| 5 | Practice that fits school life | Short learning sessions, revision and optional timed SAT practice | A new student gets useful questions immediately; mistakes change recommendations |
| 6 | A small CBSE student pilot | Feedback from the actual target audience | Students find a chapter, finish a set and explain the correction without help |

Do not begin with another long survey, a larger question import or a compulsory level test. Learning quality and a familiar route into practice are the first priorities.

## 1. Fix the explanation gap first

The latest read-only OpenPrep audit found 13,486 active imported questions with blank explanations. A technically working demo still cannot teach a student why an answer is wrong. Do not fill this gap with unchecked generated text.

Create a smaller reviewed pilot bank first. Each solution should include the concept, each algebraic or reasoning step, the correct answer, a common wrong turn, and when helpful a faster method. For MCQs, explain why each distractor fails. Tag whether the solution is missing, drafted or reviewed; show an honest missing-solution message until review is complete.

Use original explanations and original bridge examples. Link to official resources for reference. Set a written reuse policy before copying textbook pages or question collections into the product.

## 2. Make chapters the main navigation

For a CBSE profile, show “My chapters” as the main learning entry. Use “Class” in this view and display the selected academic year. Keep SAT skill names available as secondary information.

Add versioned curriculum records and many-to-many mappings:

- Curriculum: board, academic year, class, subject and subject variant.
- Chapter: stable ID, title, order, prerequisite chapters and official source URL.
- Mapping: chapter → concept → existing SAT skill, with overlap marked as direct, partial or SAT-only.
- Question mapping: question → chapter/concept, task type and reviewed explanation status.

Keep these separate from the existing SAT taxonomy. One school chapter can span several SAT skills, and one SAT skill can appear across multiple classes. Replace the coarse `BOARD_BY_GRADE` heuristic with reviewed mappings when this layer is ready. Class membership may suggest what to offer; it must not prove mastery.

Example first bridge: Class 10 “Pair of Linear Equations in Two Variables” → simultaneous equations → the existing systems skill. Teach the familiar substitution/elimination method, then interpreting intersections and the number of solutions in SAT-style questions. This chapter is present in the official 2026–27 Class X Mathematics syllabus; the product mapping itself still needs review.

Subject variants must remain explicit. CBSE's Class X sample-paper directory lists Mathematics Basic and Standard separately, as well as English Language & Literature and English Communicative. Do not silently merge their board-exam expectations.

## 3. Teach the bridge, not just the answer

A chapter page should have four clear actions: Learn, Try examples, Practice, Review mistakes. For each concept:

1. Explain it in simple English using familiar notation.
2. Work through a school-style example step by step.
3. Show how an SAT question tests the same concept differently.
4. Give an untimed short set, then offer timed practice when useful.

Add an optional English/Hindi glossary for difficult terms, while keeping assessed English passages and answer wording intact. Have bilingual explanations reviewed. Let students turn extra language support on without changing their assumed ability.

English should start with reading evidence, vocabulary in context, grammar, transitions and sentence structure. Offer short practice from observed mistakes. Explain where SAT tasks differ from school literature or extended writing; do not claim the current SAT English bank covers the whole CBSE English syllabus.

## 4. Make practice approachable

Let a student select a familiar chapter in the question bank and start immediately. Explain the lesson connection after the answer. Start with short untimed sessions and adjust difficulty using real answers; leave the diagnostic optional.

Offer a study mode that balances school revision with SAT work. Put upcoming school exams and busy weeks in Settings, rather than adding more onboarding slides. Keep the actual SAT goal/date clearly labelled. Show completion, accuracy and recent improvement before showing speculative scores. Explain that SAT estimates are approximate and are not board-mark predictions.

After a mistake, offer a short explanation, one easier prerequisite item if needed, then a similar question and a later review. A student should not need to understand labels such as “Problem Solving and Data Analysis” to find work on percentages or statistics.

## 5. Pilot and measure

Choose a limited set of mapped maths concepts and English tasks with complete explanations. Test with CBSE students from different classes, subject variants and English comfort levels.

Measure time to first answer, chapter-search success, practice completion, explanation helpfulness, repeated errors and return visits. Compare learning on a small before/after concept set rather than promising a score increase. Collect teacher feedback on chapter alignment and solution quality.

Before widening the pilot, complete signed-in browser checks at narrow mobile widths, keyboard-only navigation, back/skip navigation, failed saves, calculator use, question assets, test submission and resume. Passing backend tests is useful evidence but does not establish visual or provider reliability.

## Optional later board-exam mode

A true board-prep mode needs short and extended responses, step/partial-credit rubrics, competency and case-based tasks, syllabus coverage and teacher-reviewed marking. Build that separately once the SAT bridge works. Do not repurpose 200–800 SAT section scores or label SAT MCQs as complete board preparation.

## Official references checked for this plan

- [CBSE curriculum 2026–27](https://cbseacademic.nic.in/curriculum_2027.html): annual class and subject syllabus index.
- [Class X Mathematics syllabus 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf): chapter and competency reference for the example mapping.
- [Class X sample papers and marking schemes 2026–27](https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html): subject variants and assessment references.
- [Class XII sample papers and marking schemes 2026–27](https://cbseacademic.nic.in/SQP_CLASSXII_2026-27.html): senior-secondary assessment references.
- [CBSE competency-based learning frameworks](https://cbseacademic.nic.in/cbe/learning-framework.html): progressive learning outcomes and suggested assessment objectives. Cross-check these against the selected current-year syllabus.

Recheck official sources at each academic-year rollover. An older map must not silently become the new year's curriculum.
