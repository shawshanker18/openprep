---
skill: m-alg-lin1
minutes: 10
tags: [solving-equations, distributing, fractions, word-problems, solution-count]
---
## What this skill is

A linear equation in one variable has a single unknown, usually $x$, that is never squared, square-rooted, or in a denominator. You solve it by undoing operations until $x$ is alone. The SAT also asks you to build the equation from a short story, and to decide whether an equation has **one solution, no solution, or infinitely many solutions**, often with a missing constant you must find.

## Key ideas

- Whatever you do to one side, do to the other. The goal is always $x = \text{number}$.
- **Distribute first**, then combine like terms on each side, then move all $x$-terms to one side.
- **Clear fractions early** by multiplying every term on both sides by the least common denominator. Decimals work the same way: multiply by $10$ or $100$.
- In word problems, a one-time amount is a constant and a per-unit amount multiplies the variable: "a \$20 fee plus \$8 per hour" becomes $20 + 8h$.
- After simplifying, every linear equation looks like $ax + b = cx + d$. Comparing the coefficients tells you how many solutions there are.

## Formulas and rules

| After simplifying $ax + b = cx + d$ | Number of solutions |
|---|---|
| $a \ne c$ | exactly one |
| $a = c$ and $b \ne d$ | none (e.g. $3 = 7$) |
| $a = c$ and $b = d$ | infinitely many (e.g. $5 = 5$) |

- Distributing a negative flips every sign inside: $-2(x - 3) = -2x + 6$.
- To clear $\frac{x}{4}$ and $\frac{x}{6}$, multiply by $12$, not by $24$ (either works, but the smaller number keeps the arithmetic easy).

## Worked example 1 (easy)

Solve $7x + 4 = 3x + 24$.

1. Subtract $3x$ from both sides: $4x + 4 = 24$.
2. Subtract $4$: $4x = 20$.
3. Divide by $4$: $x = 5$.

Check: $7(5) + 4 = 39$ and $3(5) + 24 = 39$. Correct.

## Worked example 2 (SAT-level)

*In the equation $\frac{1}{2}(8x - 6) + kx = 3 - 2x$, $k$ is a constant. If the equation has no solution, what is the value of $k$?*

1. Distribute: $4x - 3 + kx = 3 - 2x$.
2. Group the left side: $(4 + k)x - 3 = -2x + 3$.
3. No solution means the $x$-coefficients match but the constants do not. Set $4 + k = -2$, so $k = -6$.
4. Confirm the constants differ: $-3 \ne 3$. Good.

Check: with $k = -6$ the equation becomes $-2x - 3 = -2x + 3$, which simplifies to $-3 = 3$. That is never true, so there is no solution, as required.

If the question had said *infinitely many* solutions, you would need the constants to match too. That is impossible here, so no value of $k$ would work.

## Common traps

- **Distributing to only the first term.** $4(x + 6)$ is $4x + 24$, not $4x + 6$.
- **Dropping the sign with a subtraction.** In $10 - 2(x - 4)$, the result is $10 - 2x + 8$, not $10 - 2x - 8$.
- **Clearing fractions on one term only.** Multiply *every* term, including whole numbers: $\frac{x}{3} + 2 = 5$ times $3$ is $x + 6 = 15$.
- **Mixing up "no solution" and "infinitely many."** Same $x$-coefficient plus different constants means none; everything the same means infinitely many.
- **Answering the wrong quantity.** If the question asks for $2x - 1$ or for the number of *hours*, compute that after you find $x$.

## The fast way (and when to use Desmos)

For one- and two-step equations, algebra is faster than typing. Desmos earns its place when the equation is long, has decimals, or has fractions on both sides:

- **Solve:** graph $y = $ (left side) and $y = $ (right side) as two lines, then click the intersection. Its $x$-coordinate is the solution.
- **Count solutions:** if the two lines are parallel, there is no solution; if Desmos draws one line on top of the other, there are infinitely many.
- **Find a constant:** type the constant as a letter (like $k$), click "add slider," and drag until the lines become parallel or overlap.

For answer choices that are numbers, plugging each one into the original equation is a quick, reliable check.
