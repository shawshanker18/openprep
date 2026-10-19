---
skill: m-psda-inference
minutes: 12
tags: [margin-of-error, intervals, sample-size, bias]
---
## What this skill is

A sample estimates a population, and the margin of error says how far the estimate could be off. At mastery level you compare intervals, judge what a larger sample can and cannot fix, and recognise bias.

> **Ask two questions first.** Was the sample random? Does the estimate describe the population the question asks about?

## Learn the idea

**Try this first.** A random sample of $400$ people finds $60\%$ support a plan. Roughly how large is the margin of error?

**Let's reason it through.**

1. For a random sample, the margin of error is about $\dfrac{1}{\sqrt{n}}$. Why the square root? Because the random noise in an average shrinks as the sample grows, but more slowly than the sample itself.
2. With $n = 400$: $\dfrac{1}{\sqrt{400}} = \dfrac{1}{20} = 0.05$, so the margin is about $5\%$.
3. The estimate is $60\%$ with a margin of $5\%$, so the plausible range is $55\%$ to $65\%$.
4. Check the reasoning: quadrupling the sample halves the margin. That is the square-root rule in action.

**Your turn.** An estimate is $48\%$ with a margin of $4\%$. Another estimate is $52\%$ with a margin of $3\%$. Do the intervals overlap, and what can you conclude?

**Answer:** The first interval is $44\%$ to $52\%$ and the second is $49\%$ to $55\%$. They overlap, so the data do not clearly show which value is larger.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Interval | Estimate $\pm$ margin of error. |
| Margin size | Roughly $\dfrac{1}{\sqrt{n}}$ for a random sample of size $n$. |
| Bias | A biased sample stays biased however large it is. |

**Desmos check, step by step:**

1. Type $y = \dfrac{1}{\sqrt{x}}$ to see how the margin shrinks.
2. Click the point at $x = 400$. The margin is $0.05$, or $5\%$.

```desmos-open
y=\frac{1}{\sqrt{x}}
(400,0.05)
```

## Worked example 1 (easy)

*Poll A: $52\% \pm 3\%$. Poll B: $48\% \pm 3\%$. Which group is ahead?*

1. Poll A's range is $49\%$ to $55\%$. Poll B's range is $45\%$ to $51\%$.
2. The ranges overlap between $49\%$ and $51\%$, so the poll does not clearly show who is ahead.

## Worked example 2 (SAT-level)

*An online poll gets $5{,}000$ responses from volunteers, and a random sample of $500$ is taken from the population. Which result is more trustworthy, and why?*

1. The random sample of $500$ represents the population, with a margin of about $\dfrac{1}{\sqrt{500}} \approx 4.5\%$.
2. The volunteers are not random, so their large size does not fix the bias.
3. The random sample is more trustworthy, even though it is smaller.

## Common traps

- **Treating a large biased sample as reliable.**
- **Applying an interval to individuals.** It describes the population's percent, not each person.
- **Declaring a winner when intervals overlap.**

## The fast way (and when to use Desmos)

Write each interval as estimate $\pm$ margin and compare the endpoints. Use the square-root rule to see how much a bigger sample helps. Desmos draws the margin curve so you can see the diminishing return.
