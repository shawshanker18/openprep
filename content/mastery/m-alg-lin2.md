---
skill: m-alg-lin2
minutes: 12
tags: [slope, parallel, perpendicular, intercepts, lines-through-points]
---
## What this skill is

A line is the set of all points that satisfy one linear equation. At mastery level you read the slope and intercepts as meaningful quantities, and you build a line from the conditions it must meet.

> **Build the line first.** Write the slope you need and one point the line passes through, then write the equation.

## Learn the idea

**Try this first.** Find the line through $(0, 1)$ that is parallel to $2x + 3y = 6$.

**Let's reason it through.**

1. Parallel lines have the same slope. So first find the slope of $2x + 3y = 6$: solve for $y$ to get $y = -\tfrac{2}{3}x + 2$. The slope is $-\tfrac{2}{3}$.
2. Why must the slope match? Parallel lines never meet, and the same slope means they rise and fall at the same rate.
3. The new line passes through $(0, 1)$, so its $y$-intercept is $1$: $y = -\tfrac{2}{3}x + 1$.
4. Check the point: at $x = 0$, $y = 1$. It is on the line.

**Your turn.** Find the line through $(6, 1)$ perpendicular to $y = 3x - 2$.

**Answer:** The slope of $y = 3x - 2$ is $3$, so the perpendicular slope is $-\tfrac{1}{3}$. Then $y - 1 = -\tfrac{1}{3}(x - 6)$, which is $y = -\tfrac{1}{3}x + 3$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Parallel | Equal slopes. |
| Perpendicular | Slopes multiply to $-1$. |
| Point-slope | $y - y_1 = m(x - x_1)$ |
| Slope of $Ax + By = C$ | $-\dfrac{A}{B}$ |

**Desmos check, step by step:**

1. Type $2x + 3y = 6$ and $y = -\tfrac{2}{3}x + 1$.
2. The two lines never meet and look parallel, so the second is parallel to the first.

```desmos-open
2x+3y=6
y=-\frac{2}{3}x+1
```

## Worked example 1 (easy)

*Find the $x$-intercept and $y$-intercept of $4x - 2y = 8$, and say what the slope means in terms of the line's steepness.*

1. $y$-intercept: set $x = 0$, so $-2y = 8$ and $y = -4$.
2. $x$-intercept: set $y = 0$, so $4x = 8$ and $x = 2$.
3. Slope: $-\dfrac{4}{-2} = 2$. For every $1$ step right, the line rises $2$.

## Worked example 2 (SAT-level)

*A line passes through $(1, 4)$ and $(5, 12)$. What is its $x$-intercept?*

1. Slope: $\dfrac{12 - 4}{5 - 1} = 2$.
2. Equation: $y - 4 = 2(x - 1)$, so $y = 2x + 2$.
3. Set $y = 0$: $2x + 2 = 0$, so $x = -1$.

## Common traps

- **Using the same slope for perpendicular lines.** Perpendicular slopes are negative reciprocals, not copies.
- **Forgetting to flip the sign when solving for $y$.** In $2x + 3y = 6$, the slope is $-\tfrac{2}{3}$, not $\tfrac{2}{3}$.
- **Reading the intercept as the slope.** In $y = mx + b$, $b$ is where the line crosses the $y$-axis.

## The fast way (and when to use Desmos)

Graph the given line and your candidate. Parallel lines never meet, and perpendicular lines cross at a right angle. Use the slope rules to build the candidate in the first place.
