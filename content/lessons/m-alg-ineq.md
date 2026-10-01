---
skill: m-alg-ineq
minutes: 11
tags: [solving-inequalities, modeling, systems-of-inequalities]
---
## What this skill is

A linear inequality is like a linear equation, but with $<$, $>$, $\le$, or $\ge$ instead of $=$. Its solution is a range of values, not a single number. On the SAT you will solve one-variable inequalities (including compound ones), translate words like "at most" into symbols, and work with **systems of inequalities**, whose solutions are shaded regions in the $xy$-plane.

## Key ideas

- Solve exactly as you would an equation, with one extra rule: **multiplying or dividing by a negative number flips the inequality sign.**
- A compound inequality such as $-5 < 1 - 3x \le 10$ is solved by doing the same step to all three parts at once.
- In context, the answer is often a whole number. "Greatest number of boxes" means round **down**; "least number of trips" means round **up**.
- A point is a solution to a system of inequalities only if it satisfies **every** inequality in the system.
- On a graph, $y > mx + b$ is the region above the line; $y < mx + b$ is below. A dashed line means the boundary is not included.

## Formulas and rules

| Words | Symbol |
|---|---|
| at least, no less than, minimum | $\ge$ |
| at most, no more than, maximum | $\le$ |
| more than, exceeds | $>$ |
| fewer than, below | $<$ |

Example translation: a rental costs \$40 plus \$0.65 per mile, and the budget is at most \$120. Then $40 + 0.65m \le 120$, so $m \le 123.07\ldots$, and the greatest whole number of miles is $123$.

## Worked example 1 (easy)

Solve $5 - 3x < 17$.

1. Subtract $5$: $-3x < 12$.
2. Divide by $-3$ and **flip** the sign: $x > -4$.

Check with a value in the range, $x = 0$: $5 < 17$, true. Check one outside it, $x = -5$: $5 + 15 = 20 < 17$ is false. Correct.

## Worked example 2 (SAT-level)

*The point $(a, 4)$ is a solution to the system $y \ge x - 3$ and $y < -2x + 16$. If $a$ is an integer, what is the greatest possible value of $a$?*

1. Substitute $y = 4$ into the first inequality: $4 \ge a - 3$, so $a \le 7$.
2. Substitute into the second: $4 < -2a + 16$, so $2a < 12$ and $a < 6$.
3. Both must hold, so $a < 6$. The greatest integer is $a = 5$.

Check: $a = 5$ gives $4 \ge 2$ and $4 < 6$, both true. $a = 6$ gives $4 < 4$, which is false. So $5$ is the answer.

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
