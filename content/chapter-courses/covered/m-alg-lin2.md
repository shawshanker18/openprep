---
skill: m-alg-lin2
minutes: 8
---
## Quick recap

From school you can write a line in slope-intercept form and standard form and find where it crosses the axes. This route assumes that and focuses on the moves the SAT likes: reading slope straight from standard form, parallel and perpendicular lines, and systems with a missing constant.

## What the SAT adds

- **Slope from standard form.** For $Ax + By = C$ the slope is $-\dfrac{A}{B}$. You do not need to solve for $y$.
- **Parallel lines** have equal slopes. **Perpendicular lines** have slopes whose product is $-1$.
- **Systems with an unknown constant.** Two lines have no solution when they are parallel but not the same line, and infinitely many when they are the same line.
- **Story setups.** "Adult tickets cost \$8 and child tickets \$5, total \$200" becomes $8a + 5c = 200$. Intercepts then mean "all adults" or "all children".

## Worked example

Line $\ell$ is $6x + 4y = 20$. A line parallel to $\ell$ passes through $(2, 1)$. What is its equation?

The slope of $\ell$ is $-\dfrac{6}{4} = -\dfrac{3}{2}$, so the new line has that slope too. Use point-slope form: $y - 1 = -\dfrac{3}{2}(x - 2)$.

Now a system: for what value of $k$ does $3x + ky = 12$ and $9x + 6y = 40$ have no solution?

Multiply the first equation by $3$ to line up the $x$ terms: $9x + 3ky = 36$. The $y$ terms must match, so $3k = 6$ and $k = 2$. Then the left sides are identical but $36 \ne 40$, so the lines are parallel and distinct. No solution, as required.

## Common traps

- Forgetting the minus sign in $-\dfrac{A}{B}$.
- Using the same slope for a perpendicular line instead of the negative reciprocal.
- Stopping once the left sides match. For "no solution" the constants must also fail to match. If they match too, you have infinitely many solutions.

## Shortcuts and calculator checks

Type both equations into Desmos and add a slider for $k$. Drag it until the lines stop crossing. Desmos also shows intersection points when you click them, which is a fast check on a solved system.
