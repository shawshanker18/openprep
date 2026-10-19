---
skill: m-adv-nonlin-eq
minutes: 13
tags: [discriminant, parameters, extraneous-solutions, line-and-parabola]
---
## What this skill is

A quadratic equation can have two, one, or no solutions, depending on its coefficients. At mastery level you use the discriminant to reason about a parameter, and you check for solutions that appear only because of a step like squaring.

> **Build the condition first.** If the question asks how many solutions, write the discriminant and its sign before you solve.

## Learn the idea

**Try this first.** For which $k$ does $x^2 + kx + 9 = 0$ have exactly one real solution?

**Let's reason it through.**

1. One real solution means the parabola just touches the $x$-axis. Why does touching mean one solution? The quadratic has exactly one place where it equals zero.
2. The discriminant measures this. Here $a = 1$, $b = k$, $c = 9$, so the discriminant is $k^2 - 36$.
3. One solution needs the discriminant to be zero: $k^2 - 36 = 0$, so $k^2 = 36$.
4. Therefore $k = 6$ or $k = -6$. Both give a perfect square, $(x \pm 3)^2 = 0$.

**Your turn.** Solve $\sqrt{x} = -2$. Does squaring help?

**Answer:** Squaring gives $x = 4$, but $\sqrt{4} = 2$, not $-2$. A square root is never negative, so there is no solution. The $x = 4$ is extraneous: it came from squaring and fails the original.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Discriminant | For $ax^2 + bx + c = 0$, $b^2 - 4ac$: positive gives two solutions, zero gives one, negative gives none. |
| Extraneous solutions | Squaring both sides can add false answers, so check each one in the original. |

**Desmos check, step by step:**

1. Type $y = x^2 + 6x + 9$. It touches the $x$-axis at one point, $x = -3$.
2. Type $y = x^2 + 4$. It stays above the axis, so there is no real solution.

```desmos-open
y=x^2+6x+9
y=x^2+4
```

## Worked example 1 (easy)

*How many real solutions does $2x^2 - 3x + 5 = 0$ have? Use the discriminant only.*

1. Discriminant: $(-3)^2 - 4(2)(5) = 9 - 40 = -31$.
2. The discriminant is negative, so there are no real solutions.

## Worked example 2 (SAT-level)

*The line $y = x + 1$ and the parabola $y = x^2 - 3$ meet at how many points?*

1. Set them equal: $x + 1 = x^2 - 3$, so $x^2 - x - 4 = 0$.
2. Discriminant: $(-1)^2 - 4(1)(-4) = 1 + 16 = 17$.
3. It is positive, so there are two intersection points.

## Common traps

- **Using the discriminant for a non-quadratic.** It only applies when the highest power is $2$.
- **Forgetting the negative root.** $x^2 = 25$ has two solutions, $5$ and $-5$.
- **Accepting an answer without checking it.** Every answer from squaring must be substituted back.

## The fast way (and when to use Desmos)

Graph the quadratic and count where it crosses the axis. For a parameter, drag a slider until the crossings merge into one or disappear. Use the discriminant to confirm the exact value.
