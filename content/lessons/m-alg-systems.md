---
skill: m-alg-systems
minutes: 12
tags: [substitution, elimination, modeling, solution-count]
---
## What this skill is

A system of two linear equations is a pair of equations that must be true at the same time. Its solution is the point $(x, y)$ where the two lines cross. The SAT asks you to solve systems, to build them from word problems (two unknowns, two facts), and to decide when a system has **no solution** or **infinitely many solutions**.

## Key ideas

- **Substitution** works best when one equation already says $y = \ldots$ or $x = \ldots$.
- **Elimination** works best when the coefficients line up: add or subtract the equations so one variable cancels. Multiply an equation first if needed.
- A word problem with a count and a total usually gives one "how many" equation and one "how much" equation: $a + c = 150$ and $12a + 7c = 1400$.
- If a question asks for $x + y$ or $3x - y$, look for a way to get it directly by adding or subtracting the equations.
- Two lines meet once, never (parallel), or everywhere (the same line).

## Formulas and rules

For $a_1x + b_1y = c_1$ and $a_2x + b_2y = c_2$:

| Condition | Solutions | Graph |
|---|---|---|
| $\frac{a_1}{a_2} \ne \frac{b_1}{b_2}$ | exactly one | lines cross |
| $\frac{a_1}{a_2} = \frac{b_1}{b_2} \ne \frac{c_1}{c_2}$ | none | parallel lines |
| $\frac{a_1}{a_2} = \frac{b_1}{b_2} = \frac{c_1}{c_2}$ | infinitely many | same line |

In plain words: no solution means same slope, different intercept. Infinitely many means one equation is a multiple of the other.

## Worked example 1 (easy)

Solve the system $4x + 3y = 26$ and $2x - 3y = 4$.

1. The $y$-terms are opposites, so add the equations: $6x = 30$, and $x = 5$.
2. Substitute into the first: $20 + 3y = 26$, so $3y = 6$ and $y = 2$.

Check in the second: $2(5) - 3(2) = 10 - 6 = 4$. Correct. The solution is $(5, 2)$.

## Worked example 2 (SAT-level)

*In the system $6x - 9y = 15$ and $4x + ky = c$, $k$ and $c$ are constants. If the system has infinitely many solutions, what is the value of $k + c$?*

1. Infinitely many solutions means the second equation is a multiple of the first.
2. Compare the $x$-coefficients: $4 = 6 \cdot \frac{2}{3}$, so the multiplier is $\frac{2}{3}$.
3. Apply it to the rest: $k = -9 \cdot \frac{2}{3} = -6$ and $c = 15 \cdot \frac{2}{3} = 10$.
4. So $k + c = -6 + 10 = 4$.

Check: $\frac{2}{3}(6x - 9y) = 4x - 6y$ and $\frac{2}{3}(15) = 10$, so the second equation is $4x - 6y = 10$. That's the same line, so it checks out.

## Common traps

- **Stopping after one variable.** If the question asks for $y$ or $x + y$, finish the job.
- **Subtracting only some terms.** When you subtract equations, subtract every term, including the constants: $(3x + y) - (3x - y) = 2y$.
- **Mixing up the solution-count conditions.** Matching slopes alone gives no solution; you need the constants to match too for infinitely many.
- **Setting up a word problem with the totals swapped.** The count equation uses $1$ as each coefficient; the money equation uses the prices.
- **Multiplying only one side** when scaling an equation for elimination.

## The fast way (and when to use Desmos)

Desmos is often fastest here, especially with decimals:

- **Solve:** type both equations exactly as given (no need to solve for $y$) and click the intersection point.
- **Then compute:** if the question asks for $x + y$, add the coordinates of the intersection.
- **Solution count:** parallel lines mean no solution; one line drawn on top of the other means infinitely many.
- **Unknown constant:** type $k$ as a letter, add a slider, and drag until the lines become parallel (no solution) or coincide (infinitely many).

Use algebra when the coefficients already cancel, as in example 1, because adding the equations takes seconds. For constant-finding questions, the ratio table above is usually quicker than dragging a slider to an exact fraction.
