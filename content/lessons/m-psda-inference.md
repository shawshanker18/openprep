---
skill: m-psda-inference
minutes: 10
tags: [population-estimates, sampling, margin-of-error, confidence-intervals]
---
## What this skill is

Inference means using a **sample** to say something about a whole **population**. The SAT asks you to scale a sample result up to a population estimate, to read and compare **margins of error** and **confidence intervals**, and to judge which sampling method gives trustworthy results. Most questions need careful reading more than calculation.

## Key ideas

- A **random sample** represents the population it was drawn from. That is what lets you scale its results up.
- To estimate a count in the population, multiply the sample proportion by the population size.
- A sample result is an **estimate**. The **margin of error** gives a range of plausible values: estimate $\pm$ margin of error.
- **Larger random samples** give smaller margins of error. Sample size does not fix bias, though. A large biased sample is still biased.
- A confidence interval is about a **population parameter** (such as the mean or the percent), not about individual members.
- If two intervals overlap, the data do not clearly show which population value is larger. If they do not overlap, there is convincing evidence of a difference.

## Formulas and rules

$$\text{population estimate} = \frac{\text{count in sample}}{\text{sample size}} \times \text{population size}$$

| Given | Find |
|---|---|
| estimate $E$, margin $M$ | interval from $E - M$ to $E + M$ |
| interval from $L$ to $U$ | estimate $= \frac{L + U}{2}$, margin $= \frac{U - L}{2}$ |

- To estimate how many do **not** have a trait, use the complement: $1 - \text{sample proportion}$.

### Reading a margin of error

An estimate of $86\%$ with a margin of error of $4\%$ means the true percent is plausibly between $82\%$ and $90\%$. A conclusion has to stay inside that range. If a second estimate's interval starts above $90\%$, the difference is convincing.

### Comparing two estimates with margins

Build each interval as estimate $\pm$ margin. A mean of $6.4 \pm 1.5$ gives $4.9$ to $7.9$, and $7.6 \pm 0.9$ gives $6.7$ to $8.5$. The intervals overlap, so the data do not clearly show which mean is larger.

## Worked example 1 (easy)

An inspector tests a random sample of $250$ phones from a shipment of $15{,}000$ and finds $9$ defective. Estimate the number of defective phones in the shipment.

1. Sample proportion: $\frac{9}{250} = 0.036$.
2. Scale up: $0.036 \times 15{,}000 = 540$.

Check with a proportion: $\frac{9}{250} = \frac{x}{15{,}000}$ gives $x = 9 \times 60 = 540$. Correct.

## Worked example 2 (SAT-level)

*In a random survey of households in Town A, the plausible values for the percent that own an electric bike are from 41.2% to 46.8%. In Town B, a similar survey estimated 49% with a margin of error of $2$ percentage points. What was Town A's estimate and margin of error, and what can be concluded?*

1. Town A's estimate is the midpoint: $\frac{41.2 + 46.8}{2} = 44$, so 44%.
2. Its margin of error is half the width: $\frac{46.8 - 41.2}{2} = 2.8$ percentage points.
3. Town B's interval runs from 47% to 51%.
4. The intervals do not overlap (A tops out at 46.8%), so there is convincing evidence that a greater percent of households in Town B own an electric bike.

If Town B's margin had been $3$ points, its interval would start at 46%, overlapping Town A's, and no clear conclusion could be drawn.

## Common traps

- **Applying an interval to individuals.** "The mean nightly sleep is plausibly between $6.8$ and $7.4$ hours" does not mean most students sleep that long.
- **Thinking a bigger sample removes bias.** A survey of $5{,}000$ volunteers can still misrepresent the population.
- **Scaling to the wrong population.** A sample of seniors at one school tells you about seniors at that school, not about all students.
- **Forgetting the complement.** If the question asks how many are **not** infected, subtract from the total or use $1 - p$.
- **Doubling the margin incorrectly.** The margin of error is half the interval's width, not the full width.

## The fast way (and when to use Desmos)

Desmos adds little here: the math is one multiplication or one midpoint. The fast way is a reading habit:

- **For estimates,** find the sample fraction, then multiply by the population. Simplify first when you can: $\frac{9}{250}$ of $15{,}000$ is $9 \times 60$.
- **For intervals,** convert everything to the form "from $L$ to $U$" and compare the endpoints directly.
- **For sampling questions,** ask two things: Was the sample chosen at random? From which group? The answer that names random selection from the full population is almost always correct.
- **For conclusions,** eliminate any choice that says "proves," "all," or "exactly," or that talks about individuals instead of the population mean or percent.

Use Desmos only as a calculator for awkward numbers, so nothing gets rounded too early.
