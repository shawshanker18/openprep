---
skill: m-adv-equiv
minutes: 12
tags: [equivalence, structure, domains, rational-expressions]
---
## What this skill is

Two expressions are equivalent when they agree wherever both are defined. At mastery level you recognise a structure that makes two forms equal, and you notice the values an expression cannot take.

> **Build the structure first.** Look for a pattern such as a difference of squares or a common factor before you expand anything.

## Learn the idea

**Try this first.** Is $\dfrac{x^2 - 9}{x + 3}$ equivalent to $x - 3$?

**Let's reason it through.**

1. Look for the structure: $x^2 - 9$ is a difference of squares, $(x - 3)(x + 3)$. Why look for this first? Because it tells you the top has a factor that matches the bottom.
2. Cancel the common factor $(x + 3)$: the expression becomes $x - 3$.
3. Notice what the cancellation hides. At $x = -3$, the original has a zero denominator and is undefined, while $x - 3$ equals $-6$.
4. So the expressions are equivalent for every $x \ne -3$. At $x = -3$ the original does not exist, so the answer is not a full equivalence.

**Your turn.** Is $\dfrac{x^2 - 1}{x - 1}$ equivalent to $x + 1$?

**Answer:** Factor the top: $(x - 1)(x + 1)$. Cancel to get $x + 1$, which holds for every $x \ne 1$. At $x = 1$ the original is undefined, so they are equivalent except at that one value.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Difference of squares | $a^2 - b^2 = (a + b)(a - b)$ |
| Square of a sum | $(a + b)^2 = a^2 + 2ab + b^2$ |
| Restricted values | A value that makes a denominator zero is excluded from the domain. |

**Desmos check, step by step:**

1. Type $y = \dfrac{x^2 - 9}{x + 3}$ and $y = x - 3$.
2. The lines match everywhere except at $x = -3$, where the first curve has a gap. That gap is the excluded value.

```desmos-open
y=\frac{x^2-9}{x+3}
y=x-3
```

## Worked example 1 (easy)

*Without expanding fully, explain why $(x + 2)^2 - 4$ equals $x^2 + 4x$.*

1. Expand only the square: $(x + 2)^2 = x^2 + 4x + 4$.
2. Subtract $4$: $x^2 + 4x + 4 - 4 = x^2 + 4x$.
3. The two forms are equal for every $x$, so they are equivalent with no restriction.

## Worked example 2 (SAT-level)

*For which values of $x$ is $\dfrac{x^2 - 4}{x - 2}$ equal to $x + 2$?*

1. Factor the top: $x^2 - 4 = (x - 2)(x + 2)$.
2. Cancel $(x - 2)$: the expression is $x + 2$ wherever $x - 2 \ne 0$.
3. So the answer is every $x$ except $x = 2$, where the original is undefined.

## Common traps

- **Cancelling terms instead of factors.** You can cancel $(x - 2)$ only when it multiplies the whole top and bottom.
- **Ignoring the excluded value.** A rational expression can be equal to a polynomial everywhere except where it is undefined.
- **Squaring a sum term by term.** $(x + 2)^2$ is $x^2 + 4x + 4$, not $x^2 + 4$.

## The fast way (and when to use Desmos)

Graph both forms. If they overlap except at a gap, the gap is the excluded value. Test one value that is not excluded, and one that is, to confirm the structure.
