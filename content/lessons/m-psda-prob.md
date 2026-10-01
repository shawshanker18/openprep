---
skill: m-psda-prob
minutes: 11
tags: [simple-probability, two-way-tables, conditional-probability, compound-events]
---
## What this skill is

Probability measures how likely an event is, as a number from $0$ (impossible) to $1$ (certain). The SAT tests **simple probability** from counts, reading **two-way tables**, **conditional probability** ("given that…"), and **compound events** (two spins, two draws, "at least one").

## Key ideas

- When outcomes are equally likely, probability is a fraction: favorable outcomes over total outcomes.
- **"Given that"** shrinks the group you choose from. The denominator becomes the size of the given group, not the grand total.
- In a two-way table, identify the denominator first: the whole table, one row, or one column.
- For **independent** events (spins, coin flips, draws *with* replacement), multiply the probabilities.
- **Without replacement**, the second probability changes because one item is gone.
- "At least one" is usually easiest as $1 - P(\text{none})$.
- When the data are given as percents, imagine a convenient total (such as $1{,}000$ people) and convert to counts.

## Formulas and rules

$$P(A) = \frac{\text{favorable outcomes}}{\text{total outcomes}} \qquad P(\text{not } A) = 1 - P(A)$$

$$P(A \mid B) = \frac{\text{number in both } A \text{ and } B}{\text{number in } B}$$

| Situation | Rule |
|---|---|
| independent $A$ and $B$ | $P(A \text{ and } B) = P(A) \cdot P(B)$ |
| at least one | $1 - P(\text{none})$ |
| two draws without replacement | $\frac{a}{n} \cdot \frac{a - 1}{n - 1}$ |

Example: a box has $5$ red and $7$ white tiles. Drawing two red tiles without replacement has probability $\frac{5}{12} \cdot \frac{4}{11} = \frac{20}{132} = \frac{5}{33}$.

## Worked example 1 (easy)

A jar has $6$ lemon, $9$ cherry, and $5$ grape candies. One is chosen at random. What is the probability it is **not** cherry?

1. Total: $6 + 9 + 5 = 20$.
2. Not cherry: $6 + 5 = 11$.
3. Probability: $\frac{11}{20}$.

Check: $P(\text{cherry}) = \frac{9}{20}$, and $1 - \frac{9}{20} = \frac{11}{20}$. Correct.

## Worked example 2 (SAT-level)

*A store surveyed customers about where they shop.*

| | Online | In store | Total |
|---|---|---|---|
| Under 30 | $48$ | $32$ | $80$ |
| 30 or older | $27$ | $63$ | $90$ |
| Total | $75$ | $95$ | $170$ |

*If a customer who shops online is chosen at random, what is the probability the customer is under 30?*

1. "Who shops online" is the given group, so the denominator is the Online column total, $75$.
2. Under 30 and online: $48$.
3. Probability: $\frac{48}{75} = \frac{16}{25} = 0.64$.

Compare: the probability that a customer under 30 shops online is $\frac{48}{80} = 0.6$. Same cell, different denominator. That is a favorite SAT trap.

## Common traps

- **Using the grand total for a conditional probability.** $\frac{48}{170}$ answers "online and under 30," not "under 30, given online."
- **Swapping the condition.** $P(A \mid B)$ and $P(B \mid A)$ share a numerator but have different denominators.
- **Forgetting to reduce the total without replacement.** After one item is drawn, there are $n - 1$ left.
- **Adding instead of multiplying** for "this and then that."
- **Counting "at least one" case by case** and missing a case. The complement is faster and safer.
- **Taking a percent of the wrong group.** "25% of the coffee drinkers" is 25% of that group, not of everyone.

## The fast way (and when to use Desmos)

Probability on the SAT is counting, so Desmos is only a calculator here. The fast way is to **name the denominator before you look for the numerator**: underline the group after "given," "of the," or "selected from," and find that total first.

- For percent-based questions, build a quick table out of $1{,}000$ imaginary people, fill in counts, and read the answer as a fraction.
- For "at least one" over several trials, compute $1 - P(\text{none})$; for two spins that each land even with probability $\frac{1}{3}$, that is $1 - \left(\frac{2}{3}\right)^2 = \frac{5}{9}$.
- Desmos helps only for messy arithmetic, such as $\frac{0.7 \cdot 0.04}{0.7 \cdot 0.04 + 0.3 \cdot 0.1}$, typed in one line to avoid rounding.
