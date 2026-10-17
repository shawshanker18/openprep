---
skill: m-alg-lin1
minutes: 10
tags: [solving-equations, distributing, fractions, word-problems, solution-count]
---
## What this skill is

A linear equation in one variable has a single unknown, usually $x$, that is never squared, square-rooted, or in a denominator. You solve it by undoing operations until $x$ is alone. The SAT also asks you to build the equation from a short story, and to decide whether an equation has **one solution, no solution, or infinitely many solutions**, often with a missing constant you must find.

> **Build the equation first.** The SAT usually gives you a story and asks you to write the equation, not to solve one you are handed.
>
> 1. Name the unknown.
> 2. Write the equation from the words: a \$20 fee plus \$8 per hour, for $h$ hours, is $20 + 8h$.
> 3. Solve only if the question asks for a value.

## Key ideas

- Whatever you do to one side, do to the other. The goal is always $x = \text{number}$.
- **Distribute first**, then combine like terms on each side, then move all $x$-terms to one side.
- **Clear fractions early** by multiplying every term on both sides by the least common denominator. Decimals work the same way: multiply by $10$ or $100$.
- In word problems, a one-time amount is a constant and a per-unit amount multiplies the variable: "a \$20 fee plus \$8 per hour" becomes $20 + 8h$.
- After simplifying, every linear equation looks like $ax + b = cx + d$. Comparing the coefficients tells you how many solutions there are.
- **A letter can be a constant.** In $(4 + k)x$, the letter $k$ is just a number you do not know yet. So $4 + k$ is one coefficient, and you can solve for $k$ like any other unknown.
- **To make an equation have no solution or infinitely many, match the $x$-coefficients first**, then check the constants. The SAT asks for $k$ this way.

## Formulas and rules

| After simplifying $ax + b = cx + d$ | Number of solutions |
|---|---|
| $a \ne c$ | exactly one |
| $a = c$ and $b \ne d$ | none (e.g. $3 = 7$) |
| $a = c$ and $b = d$ | infinitely many (e.g. $5 = 5$) |

- Distributing a negative flips every sign inside: $-2(x - 3) = -2x + 6$.
- **Finding a missing constant $k$:** write each side as (coefficient)$\cdot x$ + constant. For *no solution*, set the coefficients equal and make sure the constants are not. For *infinitely many*, set both equal. Each condition is a small equation in $k$, so solve it like any other.
- To clear $\frac{x}{4}$ and $\frac{x}{6}$, multiply by $12$, not by $24$ (either works, but the smaller number keeps the arithmetic easy).

### Solving for a missing constant

Some equations contain a letter such as $k$ that is not the variable. Write each side as (coefficient)$\cdot x$ + constant, and treat $k$ as a number you do not know yet, so $4 + k$ is one coefficient.

Why this works: $mx + p$ and $nx + q$ are equal for *every* $x$ only when $m = n$ and $p = q$. If $m = n$ but $p \ne q$, the sides differ by the same gap for every $x$, so no $x$ can make them equal.

1. Set the $x$-coefficients equal and solve that short equation in $k$.
2. Check the constants: they must differ (no solution) or match (infinitely many).

Example: $3x + k = 3x + 5$ has no solution when $k \ne 5$ and infinitely many when $k = 5$.

**Desmos way:** type the constant as a letter, $k$. The line $k = 1$ below makes Desmos add a slider for it. Drag the slider until the two lines are parallel (no solution) or lie on top of each other (infinitely many). Here $k = 5$ puts them on top of each other.

```desmos
y=3x+k
y=3x+5
k=1
```

### Mixtures and multiplied amounts

In a mixture, the amount of the pure ingredient adds up. A $15\%$ and a $30\%$ acid solution combine to make a $25\%$ solution: $0.15x + 0.30y = 0.25(x + y)$.

"One-third as long as" means a multiplier. If Rina practiced one-third as long as Mara and practiced $25$ minutes, then Mara practiced $3 \cdot 25 = 75$ minutes.

**Desmos way:** if the total is fixed, say $x + y = 10$, replace $y$ with $10 - x$. Type $y = 0.15x + 0.30(10 - x)$ and $y = 0.25 \cdot 10$, then click where the lines cross. The $x$-coordinate is the litres of $15\%$ solution: about $3.33$ litres.

### Absolute value equations

$|A| = B$ has two cases, $A = B$ and $A = -B$. For $|11 - x| = 4$: $11 - x = 4$ gives $x = 7$, and $11 - x = -4$ gives $x = 15$. Both are solutions.

**Desmos way:** type $y = |11 - x|$ and $y = 4$. The graph is a V, and the line $y = 4$ crosses it at the two solutions, $x = 7$ and $x = 15$.

```desmos
y=|11-x|
y=4
```

### Modelling with tax

Multiply by $1.08$ for an $8\%$ tax on a charge. For $28$ dollars per day plus $8\%$ tax and a $12$ dollar fee, the total is $28d(1.08) + 12$.

**Desmos way:** Desmos evaluates a number expression as you type it. For $3$ days, type $28(1.08)(3) + 12$ and it shows $102.72$.

### A shared numerator

If $\dfrac{x+9}{4} = \dfrac{x+9}{11}$, cross-multiplying gives $11(x+9) = 4(x+9)$, so $7(x+9) = 0$ and $x + 9 = 0$.

**Desmos way:** graph $y = \dfrac{x+9}{4}$ and $y = \dfrac{x+9}{11}$. The two lines meet at one point only, where both are zero, $x = -9$.

```desmos
y=\frac{x+9}{4}
y=\frac{x+9}{11}
```

### The $x$-intercept of a fraction

A fraction equals zero when its numerator is zero and its denominator is not. For $y = \dfrac{52 - x}{ax + b}$, the $x$-intercept is $x = 52$.

**Desmos way:** type $y = \dfrac{52 - x}{2x + 3}$ and click the point where the curve crosses the $x$-axis. It is at $x = 52$, where the denominator is not zero.

```desmos
y=\frac{52-x}{2x+3}
```

### Rearranging a formula

Undo the operations in reverse order. From $R = \dfrac{0.29\,l}{A}$, multiply by $A$ and divide by $0.29$ to get $l = \dfrac{RA}{0.29}$.

**Desmos way:** Desmos cannot rearrange a formula for you, but it can check your answer. Pick $R = 3$ and $A = 2$. The rearranged formula gives $l = \dfrac{3 \cdot 2}{0.29} \approx 20.69$, and plugging that back in gives $R = 3$.

## Worked example 1 (easy)

Solve $7x + 4 = 3x + 24$.

1. Subtract $3x$ from both sides: $4x + 4 = 24$.
2. Subtract $4$: $4x = 20$.
3. Divide by $4$: $x = 5$.

Check: $7(5) + 4 = 39$ and $3(5) + 24 = 39$. Correct.

**Desmos method:** type $y = 7x + 4$ and $y = 3x + 24$, then click where the lines cross. The point is $(5, 39)$, so $x = 5$, the same answer as the algebra.

## Worked example 2 (SAT-level)

*In the equation $\frac{1}{2}(8x - 6) + kx = 3 - 2x$, $k$ is a constant. If the equation has no solution, what is the value of $k$?*

1. Distribute: $4x - 3 + kx = 3 - 2x$.
2. Group the left side: $(4 + k)x - 3 = -2x + 3$.
3. No solution means the $x$-coefficients match but the constants do not. Set $4 + k = -2$, so $k = -6$.
4. Confirm the constants differ: $-3 \ne 3$. Good.

Check: with $k = -6$ the equation becomes $-2x - 3 = -2x + 3$, which simplifies to $-3 = 3$. That is never true, so there is no solution, as required.

If the question had said *infinitely many* solutions, you would need the constants to match too. That is impossible here, so no value of $k$ would work.

**Desmos method:** type $y = \frac{1}{2}(8x - 6) + kx$ and $y = 3 - 2x$, with $k$ as a slider. Drag $k$ until the lines are parallel. They are parallel at $k = -6$ and not on top of each other, so there is no solution. The block below sets this up.

```desmos
y=\frac{1}{2}(8x-6)+kx
y=3-2x
k=1
```

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
