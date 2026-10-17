---
skill: m-alg-systems
minutes: 12
tags: [substitution, elimination, modeling, solution-count]
---
## What this skill is

A system of two linear equations is a pair of equations that must be true at the same time. Its solution is the point $(x, y)$ where the two lines cross. The SAT asks you to solve systems, to build them from word problems (two unknowns, two facts), and to decide when a system has **no solution** or **infinitely many solutions**.

> **Build the system first.** The SAT gives you two facts in words, and each becomes one equation before you solve anything.
>
> 1. Name the two unknowns.
> 2. Write one equation per fact: 150 tickets bringing in \$1400 at \$12 and \$7 gives $a + c = 150$ and $12a + 7c = 1400$.
> 3. Solve only what the question asks.

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

**Finding a missing constant when one equation is a multiple of the other:** compare one pair of matching coefficients to find the multiplier, then apply that multiplier to the other terms. For $6x - 9y = 15$ and $4x + ky = c$: $4 = 6 \cdot \frac{2}{3}$, so the multiplier is $\frac{2}{3}$. Then $k = -9 \cdot \frac{2}{3} = -6$ and $c = 15 \cdot \frac{2}{3} = 10$. Check it by multiplying the first equation by the multiplier and confirming you get the second.

### Clearing fractions and decimals first

Multiply each equation by the least common denominator to clear fractions, or by $10$ or $100$ to clear decimals, before you substitute or eliminate.

**Desmos way:** you do not need to clear anything. Type the equations with their fractions and decimals as written, and Desmos draws them. Click the crossing point for the solution.

### Equations with the same left side

For $\dfrac{x}{5} + 6(y - 4) = 33$ and $\dfrac{x}{5} - 6(y - 4) = 17$, add the equations: $\dfrac{2x}{5} = 50$, so $x = 125$. The $y$-part cancels, so you never need to find $y$.

**Desmos way:** graph $\dfrac{x}{5} + 6(y - 4) = 33$ and $\dfrac{x}{5} - 6(y - 4) = 17$ as two lines and click where they cross. The point is $\left(125, \tfrac{16}{3}\right)$, and its $x$-coordinate is the answer.

```desmos
\frac{x}{5}+6(y-4)=33
\frac{x}{5}-6(y-4)=17
```

### Rearrange before comparing

Put both equations in the form $ax + by = c$ before you compare them, because the equations may arrive in another arrangement. $30x = 900y - 1500$ becomes $30x - 900y = -1500$.

**Desmos way:** Desmos reads both forms the same way, so type $30x = 900y - 1500$ exactly as given. Rearrange only when you want to read the slope and intercept by eye.

### Find a constant from a known solution

Substitute the known value (such as $x = 1$) into both equations, solve for the constant from one of them, then check it in the other.

**Desmos way:** type the system with the constant as a letter, such as $k$. The line $k = 1$ makes Desmos add a slider. Drag the slider until the line passes through the known point.

### Distance problems with different start times

Lucía starts at $7{:}50$ at $18$ mph, and Marco starts at $8{:}00$ at $22$ mph. When Marco has ridden $t$ hours, Lucía has ridden $t + \tfrac{1}{6}$ hours. They meet when $18\left(t + \tfrac{1}{6}\right) = 22t$, so $t = 0.75$ and Marco has ridden $22(0.75) = 16.5$ miles.

**Desmos way:** graph distance against time: $y = 18\left(x + \tfrac{1}{6}\right)$ for Lucía and $y = 22x$ for Marco. The lines cross at $x = 0.75$ hours, where $y = 16.5$ miles.

```desmos
y=18(x+\frac{1}{6})
y=22x
```

## Worked example 1 (easy)

Solve the system $4x + 3y = 26$ and $2x - 3y = 4$.

1. The $y$-terms are opposites, so add the equations: $6x = 30$, and $x = 5$.
2. Substitute into the first: $20 + 3y = 26$, so $3y = 6$ and $y = 2$.

Check in the second: $2(5) - 3(2) = 10 - 6 = 4$. Correct. The solution is $(5, 2)$.

**Desmos method:** type $4x + 3y = 26$ and $2x - 3y = 4$ exactly as written, then click where they cross. The point is $(5, 2)$.

## Worked example 2 (SAT-level)

*In the system $6x - 9y = 15$ and $4x + ky = c$, $k$ and $c$ are constants. If the system has infinitely many solutions, what is the value of $k + c$?*

1. Infinitely many solutions means the second equation is a multiple of the first.
2. Compare the $x$-coefficients: $4 = 6 \cdot \frac{2}{3}$, so the multiplier is $\frac{2}{3}$.
3. Apply it to the rest: $k = -9 \cdot \frac{2}{3} = -6$ and $c = 15 \cdot \frac{2}{3} = 10$.
4. So $k + c = -6 + 10 = 4$.

Check: $\frac{2}{3}(6x - 9y) = 4x - 6y$ and $\frac{2}{3}(15) = 10$, so the second equation is $4x - 6y = 10$. That's the same line, so it checks out.

**Desmos method:** type $6x - 9y = 15$ and $4x + ky = c$, with $k$ and $c$ as sliders. Drag them until the second line lies exactly on the first. That happens at $k = -6$ and $c = 10$, so $k + c = 4$.

```desmos
6x-9y=15
4x+ky=c
k=1
c=1
```

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
