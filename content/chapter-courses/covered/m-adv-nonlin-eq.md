---
skill: m-adv-nonlin-eq
minutes: 8
---
## Quick recap

You have met circles and parabolas in Conic Sections and know how to solve quadratics. This route covers the SAT pattern that joins them: a line meeting a curve, and counting how many times it does.

## What the SAT adds

- **Substitute to intersect.** To find where a line meets a curve, replace one variable in the curve's equation with the line's expression and solve.
- **Count solutions with the discriminant.** For $ax^2 + bx + c = 0$ the number of real solutions comes from $b^2 - 4ac$: positive gives two, zero gives one (the line is tangent), negative gives none.
- **Find the other coordinate.** After solving for $x$, put it back into the line to get $y$. The question may ask for the point.

## Worked example

For what value of $k$ is the line $y = x + k$ tangent to the parabola $y = x^2 + 3$?

Set the expressions equal: $x^2 + 3 = x + k$, so $x^2 - x + (3 - k) = 0$. A tangent line meets the parabola once, so the discriminant is $0$: $1 - 4(3 - k) = 0$, which gives $k = \dfrac{11}{4}$.

Where does the circle $x^2 + y^2 = 25$ meet the line $y = x + 1$?

Substitute: $x^2 + (x + 1)^2 = 25$, so $2x^2 + 2x - 24 = 0$, or $x^2 + x - 12 = 0$. That factors as $(x + 4)(x - 3) = 0$. The points are $(-4, -3)$ and $(3, 4)$. Check one: $9 + 16 = 25$.

## Common traps

- Stopping at the $x$ values when the question asks for points.
- Mixing up the cases: "tangent" is a discriminant of $0$, not a negative one.
- Squaring $(x + 1)$ as $x^2 + 1$. Expand the middle term.

## Shortcuts and calculator checks

Graph the curve and the line in Desmos, add a slider for the unknown, and watch the number of crossings change. Clicking an intersection shows its coordinates, which confirms your algebra.
