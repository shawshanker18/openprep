---
skill: m-psda-percent
minutes: 11
tags: [reverse-percent, successive-changes, percentage-points, relative-change]
---
## What this skill is

Percent questions ask how much a quantity changed, or what it was before a change. At mastery level you undo a change, and you tell a percentage-point change apart from a relative percent change.

> **Name the base first.** Decide which value the percent is taken from before you compute.

## Learn the idea

**Try this first.** A price rises by $20\%$ to \$60. What was the price before the rise?

**Let's reason it through.**

1. The \$60 is $120\%$ of the original, so the original is the base we are looking for. Why not subtract $20\%$ of \$60? Because the $20\%$ was taken from the original price, not from \$60.
2. Undo the change: divide by $1.2$. $\dfrac{60}{1.2} = 50$.
3. Check forward: $50 \cdot 1.2 = 60$. It matches.
4. The lesson is that to undo a percent change, divide by the multiplier and never by the percent alone.

**Your turn.** A rate rises from $12\%$ to $15\%$. Is that a $3\%$ or a $25\%$ change?

**Answer:** It is a $3$ percentage-point increase. The relative change is $\dfrac{15 - 12}{12} = 25\%$. Both are correct, but they answer different questions.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Undo a change | Divide by the multiplier $1 + \dfrac{p}{100}$ or $1 - \dfrac{p}{100}$. |
| Successive changes | Multiply the multipliers. |
| Percentage points | The difference between two percents. |

**Desmos check, step by step:**

1. Type $y = 1.2x$ and $y = 60$.
2. Click where they cross. The $x$ value is $50$, the original price.

```desmos-open
y=1.2x
y=60
```

## Worked example 1 (easy)

*A salary is cut by $10\%$, then raised by $10\%$. Is it back to the original?*

1. Multipliers: $0.9 \cdot 1.1 = 0.99$.
2. The result is $1\%$ lower, so it is not back to the original.

## Worked example 2 (SAT-level)

*After a discount, a jacket costs \$54. The discount was $10\%$ off the price before a $25\%$ sale. What was the original price?*

1. The total multiplier is $0.9 \cdot 0.75 = 0.675$.
2. Undo it: $\dfrac{54}{0.675} = 80$.
3. Check: $80 \cdot 0.675 = 54$.

## Common traps

- **Adding percents in a chain.** A $10\%$ cut then $10\%$ rise is not $0\%$.
- **Dividing by the percent instead of the multiplier.**
- **Calling a percentage-point change a percent change.** Check which one the question asks for.

## The fast way (and when to use Desmos)

Write the chain as multipliers and multiply them. To undo, divide. Graph the forward change if you want to see where the undone value lands.
