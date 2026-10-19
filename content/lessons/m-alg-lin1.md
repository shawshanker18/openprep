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

> **Desmos for this skill: four moves.** Desmos does the arithmetic, so your job is the setup.
>
> 1. **Solve an equation:** graph the left side and the right side as two lines, then click where they cross. The $x$-value is the answer.
> 2. **Find a missing constant $k$:** type $k = 1$ to get a slider, then drag it until the lines are parallel (no solution) or lie on top of each other (infinitely many).
> 3. **Check an answer choice:** graph the equation and the choice's value as a line. If they cross on the solution, the choice is right.
> 4. **Read a long number:** type the arithmetic in one line, such as $28(1.08)(3) + 12$, and Desmos shows the result.
>
> ```desmos-open
> y=3x+k
> y=3x+5
> k=1
> ```

## Learn the idea

**Try this first.** Solve $4(x - 2) = 2x + 8$. Which step would you do first?

**Let's work it out.**

1. The left side has a bracket, so distribute the $4$. Why? The bracket is multiplied by $4$, and multiplying each term keeps the equation balanced: $4x - 8 = 2x + 8$.
2. The $x$ terms are on both sides. Subtract $2x$ from both sides to gather them. Why is that allowed? Whatever you do to one side, you do to the other, so the equation stays true: $2x - 8 = 8$.
3. Add $8$ to both sides to move the constant away from $x$: $2x = 16$.
4. Divide both sides by $2$. Now $x$ is alone: $x = 8$.
5. Check in the original. Left: $4(8 - 2) = 24$. Right: $2(8) + 8 = 24$. They match.

**Your turn.** Solve $3(x + 1) = 2x + 9$. Start by distributing.

**Answer:** $3x + 3 = 2x + 9$, then $x + 3 = 9$, so $x = 6$. Check: $3(7) = 21$ and $2(6) + 9 = 21$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Balance rule | Do the same operation to both sides, and the equation stays true. |
| Distributive rule | $a(b + c) = ab + ac$. |
| Undo rule | Undo the operations in reverse order: add or subtract first, then multiply or divide. |
| Solution count | Simplify to $ax + b = cx + d$. If $a \ne c$, one solution. If $a = c$ and $b \ne d$, none. If $a = c$ and $b = d$, infinitely many. |
| Absolute value | $\lvert A \rvert = B$ means $A = B$ or $A = -B$, and needs $B \ge 0$. |
| Percent multiplier | An increase of $p\%$ multiplies by $1 + \frac{p}{100}$. |

**Desmos check for the solution count, step by step:**

1. Type $y = 2x + 3$ and $y = 2x + 7$. Both lines have slope $2$, so they are parallel and never meet: no solution.
2. Replace the second line with $y = x + 3$. Its slope is different, so it crosses $y = 2x + 3$ once, at $x = 0$: one solution.
3. Replace it with $y = 2x + 3$ again. The two lines lie on top of each other: infinitely many solutions.

```desmos-open
y=2x+3
y=2x+7
y=x+3
```

**Desmos check for the balance rule, step by step:**

1. Type $y = 4(x - 2)$ and $y = 2x + 8$. They cross at $x = 8$, the solution of the original equation.
2. Type $y = 4x - 8$ instead of the first line. It is the distributed form, and the crossing is still at $x = 8$. Each algebra step keeps the solution the same.

```desmos-open
y=4(x-2)
y=2x+8
y=4x-8
```

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

**Desmos way, step by step:**

1. Type $y = 3x + k$ and $y = 3x + 5$ on two lines.
2. Type $k = 1$. Desmos adds a slider for $k$.
3. Drag the slider. When the two lines lie on top of each other, $k = 5$ and there are infinitely many solutions. When they are parallel but apart, there is no solution.

```desmos-open
y=3x+k
y=3x+5
k=1
```

### Mixtures and multiplied amounts

In a mixture, the amount of the pure ingredient adds up. A $15\%$ and a $30\%$ acid solution combine to make a $25\%$ solution: $0.15x + 0.30y = 0.25(x + y)$.

"One-third as long as" means a multiplier. If Rina practiced one-third as long as Mara and practiced $25$ minutes, then Mara practiced $3 \cdot 25 = 75$ minutes.

**Desmos way, step by step:**

1. Fix the total at $10$ litres, so $y = 10 - x$ where $x$ is the litres of $15\%$ solution.
2. Type $y = 0.15x + 0.30(10 - x)$ and $y = 0.25 \cdot 10$.
3. Click where the lines cross. The $x$-value is about $3.33$ litres.

```desmos-open
y=0.15x+0.30(10-x)
y=0.25\cdot 10
```

### Absolute value equations

$|A| = B$ has two cases, $A = B$ and $A = -B$. For $|11 - x| = 4$: $11 - x = 4$ gives $x = 7$, and $11 - x = -4$ gives $x = 15$. Both are solutions.

**Desmos way, step by step:**

1. Type $y = |11 - x|$. The graph is a V.
2. Type $y = 4$, a horizontal line.
3. Click the two points where the line crosses the V. They are $x = 7$ and $x = 15$.

```desmos-open
y=|11-x|
y=4
```

### Modelling with tax

Multiply by $1.08$ for an $8\%$ tax on a charge. For $28$ dollars per day plus $8\%$ tax and a $12$ dollar fee, the total is $28d(1.08) + 12$.

**Desmos way, step by step:**

1. Type $y = 28(1.08)x + 12$. The line gives the total for any number of days $x$.
2. Type $x = 3$ to add a vertical line at three days.
3. Click where the two lines cross. The height is the total for three days, $102.72$.

```desmos-open
y=28(1.08)x+12
x=3
```

### A shared numerator

If $\dfrac{x+9}{4} = \dfrac{x+9}{11}$, cross-multiplying gives $11(x+9) = 4(x+9)$, so $7(x+9) = 0$ and $x + 9 = 0$.

**Desmos way, step by step:**

1. Type $y = \dfrac{x+9}{4}$ and $y = \dfrac{x+9}{11}$.
2. Look at the picture: the two lines meet at one point only.
3. Click that point. It is at $x = -9$, where both sides are zero.

```desmos-open
y=\frac{x+9}{4}
y=\frac{x+9}{11}
```

### The $x$-intercept of a fraction

A fraction equals zero when its numerator is zero and its denominator is not. For $y = \dfrac{52 - x}{ax + b}$, the $x$-intercept is $x = 52$.

**Desmos way, step by step:**

1. Type $y = \dfrac{52 - x}{2x + 3}$ and look at the curve.
2. Find where the curve crosses the horizontal axis and click it.
3. The $x$-value there is $52$. The denominator is not zero at that point, so the crossing is a real intercept.

```desmos-open
y=\frac{52-x}{2x+3}
```

### Rearranging a formula

Undo the operations in reverse order. From $R = \dfrac{0.29\,l}{A}$, multiply by $A$ and divide by $0.29$ to get $l = \dfrac{RA}{0.29}$.

**Desmos way, step by step:**

1. Desmos cannot rearrange a formula for you, but it can check the answer. Pick $A = 2$ and $R = 3$.
2. Type the rearranged result, $\dfrac{3 \cdot 2}{0.29}$. Desmos shows $\approx 20.69$.
3. Graph $R = \dfrac{0.29\,l}{2}$ and the point $(20.69, 3)$. The point sits on the line, so the rearranged formula is right.

```desmos-open
R=\frac{0.29l}{2}
(20.69,3)
```

## Worked example 1 (easy)

Solve $7x + 4 = 3x + 24$.

1. Subtract $3x$ from both sides: $4x + 4 = 24$.
2. Subtract $4$: $4x = 20$.
3. Divide by $4$: $x = 5$.

Check: $7(5) + 4 = 39$ and $3(5) + 24 = 39$. Correct.

**Desmos method, step by step:**

1. Type $y = 7x + 4$ and $y = 3x + 24$ on two lines.
2. Click where the lines cross. The point is $(5, 39)$.
3. Read the $x$-value: $x = 5$, the same answer as the algebra.

```desmos-open
y=7x+4
y=3x+24
```

## Worked example 2 (SAT-level)

*In the equation $\frac{1}{2}(8x - 6) + kx = 3 - 2x$, $k$ is a constant. If the equation has no solution, what is the value of $k$?*

1. Distribute: $4x - 3 + kx = 3 - 2x$.
2. Group the left side: $(4 + k)x - 3 = -2x + 3$.
3. No solution means the $x$-coefficients match but the constants do not. Set $4 + k = -2$, so $k = -6$.
4. Confirm the constants differ: $-3 \ne 3$. Good.

Check: with $k = -6$ the equation becomes $-2x - 3 = -2x + 3$, which simplifies to $-3 = 3$. That is never true, so there is no solution, as required.

If the question had said *infinitely many* solutions, you would need the constants to match too. That is impossible here, so no value of $k$ would work.

**Desmos method, step by step:**

1. Type $y = \frac{1}{2}(8x - 6) + kx$ and $y = 3 - 2x$ on two lines.
2. Type $k = 1$ to get a slider.
3. Drag $k$ until the lines are parallel. They are parallel at $k = -6$ and not on top of each other, so there is no solution.

```desmos-open
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
