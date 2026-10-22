---
skill: m-alg-ineq
minutes: 12
tags: [inequalities, integer-answers, modelling, regions]
---
## What this skill is

An inequality describes a range of allowed values. At mastery level you read what the range means in a situation: the largest affordable number, the integers that fit, and whether a point satisfies every condition.

> **Build the inequality first.** Write one inequality for each condition the story states, using "at most" as $\le$ and "at least" as $\ge$.

## Learn the idea

**Try this first.** A bike rental costs \$25 plus \$5 per hour. You have \$60. What is the most hours you can rent?

**Let's reason it through.**

1. Write the cost: $25 + 5h$. The total must not exceed \$60, so $25 + 5h \le 60$.
2. Solve: $5h \le 35$, so $h \le 7$. Why is the answer an upper bound? Every hour adds cost, so the limit is the largest value that still fits the budget.
3. Interpret the answer. The bound is $7$, and $7$ is a whole number of hours, so $7$ is the most you can rent.
4. Check: $25 + 5(7) = 60$, which is exactly the budget. Eight hours would cost \$65, which is too much.

**Your turn.** Solve $-4 < 2x + 2 \le 8$ and count the integer solutions.

**Answer:** Subtract $2$: $-6 < 2x \le 6$. Divide by $2$: $-3 < x \le 3$. The integers are $-2, -1, 0, 1, 2, 3$, so there are $6$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Flip rule | Multiplying or dividing by a negative reverses the sign. |
| Words to symbols | "at most" $\le$, "at least" $\ge$, "more than" $>$, "fewer than" $<$. |
| Whole answers | In context, round down for a maximum and up for a minimum. |

**Desmos check, step by step:**

1. Type $y \le 25 + 5x$ and $y = 60$.
2. The shaded region below the line and the horizontal line show every affordable pair. The boundary crossing is at $x = 7$.

```desmos-open
y\le 25+5x
y=60
```

## Worked example 1 (easy)

*Is the point $(3, 5)$ in the region given by $x + y \le 10$ and $2x + y \le 14$?*

1. First inequality: $3 + 5 = 8 \le 10$. True.
2. Second inequality: $2(3) + 5 = 11 \le 14$. True.
3. The point satisfies both, so it is in the region.

## Worked example 2 (SAT-level)

*A printer needs more than $200$ sheets for a job. Each box holds $25$ sheets. What is the fewest boxes needed?*

1. Let $b$ be the number of boxes: $25b > 200$.
2. Divide: $b > 8$. Since $b$ is a whole number of boxes, the smallest value is $9$.
3. Check: $8$ boxes give exactly $200$, which is not more than $200$, so $8$ is not enough. $9$ boxes give $225$.

## Common traps

- **Forgetting the strict bound.** "More than $200$" is $>$, so $200$ itself does not count.
- **Rounding the wrong way.** A maximum of $7.5$ hours means $7$ hours, but a minimum of $8.2$ boxes means $9$.
- **Testing only one condition.** A point must satisfy every inequality in the system.

## The fast way (and when to use Desmos)

Graph each inequality and look for the overlapping shaded region. Test a candidate point in every inequality. Use algebra for one-variable bounds and whole-number rounding.
