---
skill: m-alg-lin2
minutes: 9
---
## What school covered

You can write a line from a point and a slope, from two points, in intercept form, and in general form $Ax + By + C = 0$. You know parallel lines share a slope and perpendicular slopes multiply to $-1$. That machinery is assumed from here on.

## What school leaves out

The SAT asks you to work with a line as a model with an unknown constant in it, and to jump fluently between equivalent forms, which school drill does not practise.

- **Slope out of standard form.** $4x + 2y = 7$ becomes $y = -2x + 3.5$. The slope is $-\dfrac{A}{B}$, and the intercept is $\dfrac{C}{B}$. Practise the rearrangement until it is one mental step, because the SAT often presents lines in standard form.
- **Unknown constants.** "The line $y = kx - 4$ passes through $(3, 11)$. What is $k$?" Substitute: $11 = 3k - 4$, so $k = 5$. The line itself is old news; solving for a letter inside it is the new skill.
- **Parallel and perpendicular with letters.** A line parallel to $y = kx + 1$ through $(2, 5)$ has slope $k$, so $5 = 2k + 1$ and $k = 2$. For perpendicular, flip the slope and change the sign first, then solve.
- **A point on a line is a fact about the equation.** "The graph of $y = mx + b$ passes through $(1, 4)$ and $(3, 10)$" is a system about $m$ and $b$: two substitutions, two equations.
- **Interpret a coefficient in a story.** In $y = 25x + 100$ for a taxi fare, the $100$ is the fixed charge and the $25$ is the rate. Expect to say what a number means, not just compute it.

## Worked example

Line $\ell$ has equation $3x - 2y = 12$. What is its slope, and does $(2, -3)$ lie on it?

Move the $x$ term: $-2y = -3x + 12$, so $y = 1.5x - 6$. The slope is $1.5$. Test the point: $1.5(2) - 6 = -3$. Yes, the point is on the line.

Another: for what value of $k$ is the line $y = (k - 1)x + 7$ parallel to $y = -3x + 2$?

Parallel means equal slopes: $k - 1 = -3$, so $k = -2$. Note that the $7$ never mattered. Parallel lines do not need equal intercepts.

## Common traps

- Sign slips converting standard form. $3x - 2y = 12$ has slope $+\dfrac{3}{2}$, not negative, because the $y$ term was negative.
- Perpendicular slope is the negative reciprocal $\dfrac{2}{3}$ to $-\dfrac{3}{2}$, not just the reciprocal.
- Solving for $k$ but reporting $k - 1$. Answer the question that was asked.
- Testing a point by plugging into the wrong side or mixing up $(x, y)$ order.
- Reading the intercept off a table as the first listed output instead of the value at $x = 0$.

## Shortcuts and calculator checks

For "does the point lie on the line", substitute instead of re-deriving anything. In Desmos, type the line and the point; the graph answers instantly, and for two-point questions you can type `y_1 ~ mx_1 + b` with the table filled in to get the equation directly.
