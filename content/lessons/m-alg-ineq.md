---
skill: m-alg-ineq
minutes: 11
tags: [solving-inequalities, modeling, systems-of-inequalities]
---
## What this skill is

A linear inequality is like a linear equation, but with $<$, $>$, $\le$, or $\ge$ instead of $=$. Its solution is a range of values, not a single number. On the SAT you will solve one-variable inequalities (including compound ones), translate words like "at most" into symbols, and work with **systems of inequalities**, whose solutions are shaded regions in the $xy$-plane.

> **Build the inequality first.** The SAT gives you conditions in words, and you must turn each one into an inequality before solving.
>
> 1. Name the unknown.
> 2. Write one inequality per condition: a rental of \$40 plus \$0.65 per mile, at most \$120, gives $40 + 0.65m \le 120$.
> 3. Solve only if the question asks for a value.

## Learn the idea

**Try this first.** Is $x = -5$ a solution to $5 - 3x < 17$? Then test $x = 0$. Check your answers before reading on.

**Let's work it out.**

1. Test $x = -5$: $5 - 3(-5) = 20$, and $20 < 17$ is false. So $-5$ is not a solution. Test $x = 0$: $5 < 17$ is true. The solutions are on one side of some boundary, and we need to find the boundary.
2. Solve it like an equation. Subtract $5$: $-3x < 12$.
3. Now divide by $-3$. Why does the sign flip? Multiplying or dividing by a negative reverses the order of numbers. Check with $-1 < 2$: multiply both sides by $-1$ and you get $1 > -2$. The smaller number became the larger one.
4. So $x > -4$. Test again: $x = -5$ is not greater than $-4$, and it failed the test. $x = 0$ is greater than $-4$, and it passed. The test agrees.

**Your turn.** Solve $-2x \ge 6$. Remember the sign rule.

**Answer:** Divide by $-2$ and flip: $x \le -3$. Check with $x = -4$: $-2(-4) = 8 \ge 6$, which is true.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Flip rule | Multiplying or dividing both sides by a negative number reverses the inequality sign. |
| Compound inequality | Do the same step to all three parts of $a < \text{expression} < b$. |
| Test point | A point is a solution to a system only if it satisfies every inequality. |

**Desmos check for a system, step by step:**

1. Type $y \ge x - 3$. Desmos shades the region above a solid line.
2. Type $y < -2x + 16$. The shaded overlap is the solution region, and its dashed boundary is excluded.

```desmos-open
y\ge x-3
y<-2x+16
```

| Words | Symbol |
|---|---|
| at least, no less than, minimum | $\ge$ |
| at most, no more than, maximum | $\le$ |
| more than, exceeds | $>$ |
| fewer than, below | $<$ |

Example translation: a rental costs \$40 plus \$0.65 per mile, and the budget is at most \$120. Then $40 + 0.65m \le 120$, so $m \le 123.07\ldots$, and the greatest whole number of miles is $123$.

### Describing a solution set

An equation can have one solution, no solution, or all real numbers. After simplifying, if the variable cancels and a false statement is left (like $3 = 5$), there is no solution. If a true statement is left (like $5 = 5$), every value works. An inequality is solved the same way, with the sign flip rule.

**Desmos way:** graph the two sides as lines. Parallel lines mean no solution, and one line on top of the other means every value works. The same test works for inequalities: the shaded region shows which side wins.

```desmos
y=3x+2
y=3x+5
```

### Graphs of inequalities in the $xy$-plane

Draw the boundary line. Use a solid line for $\le$ or $\ge$ and a dashed line for $<$ or $>$. For $y > \ldots$, shade above the line; for $y < \ldots$, shade below. Check one point inside the shaded region to confirm.

**Desmos way:** type the inequality directly, such as $y > \frac{1}{2}x + 1$. Desmos shades the solution region for you, with a dashed boundary for $>$.

```desmos
y>\frac{1}{2}x+1
```

### Systems of inequalities in word problems

Write one inequality for each condition: "at least" and "no less than" use $\ge$; "at most," "no more than," and "under" use $\le$ or $<$. Then test a candidate pair of numbers in every inequality. A solution must satisfy all of them.

**Desmos way:** type each condition as an inequality. The overlap is the solution region, and clicking a corner gives its coordinates. The block below uses $x + y \le 10$ and $y \ge x$ as an example.

```desmos
x+y\le 10
y\ge x
```

## Worked example 1 (easy)

Solve $5 - 3x < 17$.

1. Subtract $5$: $-3x < 12$.
2. Divide by $-3$ and **flip** the sign: $x > -4$.

Check with a value in the range, $x = 0$: $5 < 17$, true. Check one outside it, $x = -5$: $5 + 15 = 20 < 17$ is false. Correct.

**Desmos method:** graph $y = 5 - 3x$ and $y = 17$. The solution is where the first line is below the second, which is $x > -4$. Click where they cross to see the boundary.

```desmos
y=5-3x
y=17
```

## Worked example 2 (SAT-level)

*The point $(a, 4)$ is a solution to the system $y \ge x - 3$ and $y < -2x + 16$. If $a$ is an integer, what is the greatest possible value of $a$?*

1. Substitute $y = 4$ into the first inequality: $4 \ge a - 3$, so $a \le 7$.
2. Substitute into the second: $4 < -2a + 16$, so $2a < 12$ and $a < 6$.
3. Both must hold, so $a < 6$. The greatest integer is $a = 5$.

Check: $a = 5$ gives $4 \ge 2$ and $4 < 6$, both true. $a = 6$ gives $4 < 4$, which is false. So $5$ is the answer.

**Desmos method:** graph $y \ge x - 3$, $y < -2x + 16$, and the horizontal line $y = 4$. The part of $y = 4$ inside the overlap ends where it meets the dashed boundary at $x = 6$. Since $a < 6$, the greatest integer is $a = 5$.

```desmos
y\ge x-3
y<-2x+16
y=4
```

## Common traps

- **Forgetting to flip.** $-6x \le 18$ becomes $x \ge -3$, not $x \le -3$.
- **Flipping when you shouldn't.** Subtracting a negative number or dividing by a positive one never flips the sign.
- **Rounding the wrong way.** If $b \le 34.4$ boxes, the answer is $34$. If you need $t > 50$ minutes for something to happen, the least whole number is $51$.
- **Using only one inequality in a system.** A point that satisfies one condition but not the other is not a solution.
- **Strict vs. inclusive.** "At least" includes the boundary value; "more than" does not.

## The fast way (and when to use Desmos)

For one-variable inequalities, algebra is fastest: two steps and a sign check. Desmos shines for systems:

- **Shade the system:** type each inequality, such as $y \ge x - 3$ and $y < -2x + 16$. The overlap is the solution region; dashed boundaries are excluded.
- **Test answer choices:** type each point, like $(5, 4)$, and see whether it lands in the overlap.
- **Find an extreme value:** click the intersection of the two boundary lines; the greatest or least coordinate allowed is usually near that corner. Then check whether the boundary itself counts.
- **One-variable check:** graph $y = 5 - 3x$ and $y = 17$; the solution is where the first graph is below the second.

When answer choices are inequalities like $x > -4$, plugging in one test value (such as $x = 0$) often eliminates three choices at once.
