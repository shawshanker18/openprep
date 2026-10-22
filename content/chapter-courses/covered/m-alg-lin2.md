---
skill: m-alg-lin2
minutes: 11
---
## What school covered

You can write a line from a point and a slope, from two points, in intercept form, and in general form $Ax + By + C = 0$. You know parallel lines share a slope and perpendicular slopes multiply to $-1$. That machinery is assumed from here on.

## What school leaves out

The SAT rarely asks for the equation of a line by itself. It asks you to work with a line as a model with an unknown constant in it, to jump fluently between equivalent forms, and to interpret what the numbers mean in a story. These are the skills the school drill never practises.

**Slope out of standard form.** $4x + 2y = 7$ becomes $y = -2x + 3.5$. In general, $Ax + By = C$ has slope $-\dfrac{A}{B}$ and $y$-intercept $\dfrac{C}{B}$. Practise the rearrangement until it is one mental step, because the SAT presents lines in standard form specifically to test it.

**Unknown constants.** "The line $y = kx - 4$ passes through $(3, 11)$. What is $k$?" Substitute: $11 = 3k - 4$, so $k = 5$. The line itself is old news; solving for a letter inside it is the new skill. The same move appears with a point on $y = 2x + b$: plug in, solve for $b$.

**Parallel and perpendicular with letters.** A line parallel to $y = kx + 1$ through $(2, 5)$ has slope $k$, so $5 = 2k + 1$ and $k = 2$. For perpendicular, flip the slope and change the sign before you solve: perpendicular to $y = \dfrac{3}{2}x$ means slope $-\dfrac{2}{3}$. SAT favourite: "for which $k$ do the two lines have no solution?" That means parallel, so set the slopes equal.

**A point on a line is a fact about the equation.** "The graph of $y = mx + b$ passes through $(1, 4)$ and $(3, 10)$" is a system about $m$ and $b$: two substitutions, two equations, one solve. Two points are enough to build the whole model.

**Build an equation from intercepts.** A line crossing the axes at $(4, 0)$ and $(0, -2)$ has slope $\dfrac{-2 - 0}{0 - 4} = \dfrac{1}{2}$. Either use the intercept form $\dfrac{x}{4} + \dfrac{y}{-2} = 1$ or build $y = \dfrac{1}{2}x - 2$. SAT questions describe intercepts in stories: "the tank is full at 400 litres at time zero and empty after 8 hours" is two intercepts of a draining model.

**Interpret a coefficient in a story.** In $y = 25x + 100$ for a taxi fare, the $100$ is the fixed charge and the $25$ is the rate. Expect to say what a number means, not just compute with it, and to answer in units.

## Worked example

Line $\ell$ has equation $3x - 2y = 12$. What is its slope, and does $(2, -3)$ lie on it?

Move the $x$ term: $-2y = -3x + 12$, so $y = 1.5x - 6$. The slope is $1.5$. Test the point: $1.5(2) - 6 = -3$. Yes, the point is on the line.

Another: for what value of $k$ is the line $y = (k - 1)x + 7$ parallel to $y = -3x + 2$?

Parallel means equal slopes: $k - 1 = -3$, so $k = -2$. Note that the $7$ never mattered. Parallel lines do not need equal intercepts.

A build-from-intercepts example: a phone plan costs \$40 to start and uses credit at \$5 per day until the \$40 is gone. Write the model and find when credit runs out.

Intercepts: $y = 40$ at $x = 0$, and $y = 0$ at $x = 8$. Slope $-\dfrac{40}{8} = -5$, so $y = 40 - 5x$ and credit runs out at $x = 8$ days.

## Common traps

- Sign slips converting standard form. $3x - 2y = 12$ has slope $+\dfrac{3}{2}$, because the $y$ term was negative.
- Perpendicular slope is the negative reciprocal: to $-\dfrac{3}{2}$ it is $\dfrac{2}{3}$, not $-\dfrac{2}{3}$ and not $\dfrac{3}{2}$.
- Solving for $k$ but reporting $k - 1$. Answer the question that was asked.
- Mixing up $(x, y)$ order when testing a point.
- Reading the intercept off a table as the first listed output instead of the value at $x = 0$.

## Shortcuts and calculator checks

For "does the point lie on the line", substitute instead of re-deriving anything. In Desmos, type the line and the point; the graph answers instantly. For "no solution / infinitely many" questions, remember they are slope questions in disguise: equal slopes with different intercepts, or identical equations.
