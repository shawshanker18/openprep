---
skill: m-alg-lin2
minutes: 11
tags: [slope-intercept, standard-form, intercepts, modeling, parallel-perpendicular]
---
## What this skill is

A linear equation in two variables, such as $y = 2x - 4$ or $3x + 5y = 30$, describes a line in the $xy$-plane. Every point on the line is a solution. The SAT asks you to move between **slope-intercept form** and **standard form**, find **intercepts**, write equations for **parallel or perpendicular** lines, and set up equations like $8a + 5c = 200$ from a story.

## Key ideas

- A point $(p, q)$ is on a line exactly when substituting $x = p$ and $y = q$ makes the equation true.
- In $y = mx + b$, you can read the slope and $y$-intercept directly.
- In $Ax + By = C$, the intercepts are quick: set $x = 0$ to get the $y$-intercept and $y = 0$ to get the $x$-intercept.
- In a model like $8a + 5c = 200$ (adult tickets at \$8, child tickets at \$5, \$200 total), each coefficient is a price per item and the constant is the total. An intercept means "all of one kind": $a = 25$ when $c = 0$.
- Parallel lines have equal slopes. Perpendicular lines have slopes that are **negative reciprocals**.

## Formulas and rules

| Form | Slope | $y$-intercept | $x$-intercept |
|---|---|---|---|
| $y = mx + b$ | $m$ | $b$ | $-\frac{b}{m}$ |
| $Ax + By = C$ | $-\frac{A}{B}$ | $\frac{C}{B}$ | $\frac{C}{A}$ |

- Point-slope form: $y - y_1 = m(x - x_1)$.
- Perpendicular slopes multiply to $-1$: slope $\frac{2}{5}$ pairs with $-\frac{5}{2}$.

## Worked example 1 (easy)

Find the slope and both intercepts of $6x - 3y = 12$.

1. Slope: $-\frac{A}{B} = -\frac{6}{-3} = 2$.
2. $y$-intercept: set $x = 0$, so $-3y = 12$ and $y = -4$.
3. $x$-intercept: set $y = 0$, so $6x = 12$ and $x = 2$.

Check by rewriting: $-3y = -6x + 12$, so $y = 2x - 4$. Slope $2$, $y$-intercept $-4$. Correct.

## Worked example 2 (SAT-level)

*Line $k$ is perpendicular to the graph of $3x + 2y = 8$ and passes through $(6, -1)$. What is the $y$-intercept of line $k$?*

1. Slope of the given line: $-\frac{3}{2}$.
2. Perpendicular slope: the negative reciprocal, $\frac{2}{3}$.
3. Point-slope form: $y + 1 = \frac{2}{3}(x - 6)$, so $y + 1 = \frac{2}{3}x - 4$.
4. Solve for $y$: $y = \frac{2}{3}x - 5$. The $y$-intercept is $-5$ (the point $(0, -5)$).

Check: at $x = 6$, $y = 4 - 5 = -1$. The line passes through $(6, -1)$, as required.

## Common traps

- **Reading the slope of $Ax + By = C$ as $\frac{A}{B}$.** The slope is $-\frac{A}{B}$; in $2x + 5y = 20$ it is $-\frac{2}{5}$.
- **Half a negative reciprocal.** The perpendicular slope to $\frac{2}{5}$ is $-\frac{5}{2}$ — flip the fraction *and* change the sign.
- **Swapping intercepts.** In $4x - 3y = 24$, the $y$-intercept is $\frac{24}{-3} = -8$, not $6$ (that is the $x$-intercept).
- **Wrong axis in a context.** If $n$ is on the horizontal axis, the horizontal intercept is the value of $n$ when the other variable is $0$.
- **Forgetting to find a constant first.** If a line $3x + ky = 21$ passes through a given point, plug the point in to get $k$ before computing anything else.

## The fast way (and when to use Desmos)

Desmos graphs standard form directly — no rearranging needed:

- **Intercepts:** type $6x - 3y = 12$ and click the grey dots on the axes.
- **Is a point on the line?** Type the point, such as $(6, -1)$, and see whether it sits on the graph.
- **Match a line to a choice:** graph each answer choice along with the conditions (the given point, the original line) and keep the one that fits.
- **Context equations:** for a question like "if $30$ adult tickets were sold," graph the equation and $x = 30$, then click the intersection.

Algebra is faster for slope questions: $-\frac{A}{B}$ is one step, and perpendicular slopes come from a mental flip.
