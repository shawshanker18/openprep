---
skill: m-geo-circles
minutes: 12
tags: [arcs-sectors, circle-equations, tangents, circles-through-points]
---
## What this skill is

Circle questions link a circle's radius to its arcs, areas, and equation. At mastery level you find the circle from given points, and you use the radius to reason about tangents.

> **Find the centre and radius first.** Every circle question starts from those two numbers.

## Learn the idea

**Try this first.** The circle $x^2 + y^2 = 25$ passes through $(3, 4)$. What is the slope of the tangent there?

**Let's reason it through.**

1. The radius from the centre $(0, 0)$ to $(3, 4)$ has slope $\dfrac{4}{3}$. Why use the radius? A tangent is perpendicular to the radius at the point where they touch.
2. Perpendicular slopes multiply to $-1$, so the tangent's slope is $-\dfrac{3}{4}$.
3. Check the geometry: the tangent should touch the circle at only that point, and the negative reciprocal is the only slope that does this.

**Your turn.** Find the circle through $(0, 0)$, $(6, 0)$ and $(0, 8)$.

**Answer:** The centre is at the midpoint of the hypotenuse, which is $(3, 4)$. The radius is the distance to $(0, 0)$: $\sqrt{9 + 16} = 5$. So $(x - 3)^2 + (y - 4)^2 = 25$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Circle equation | $(x - h)^2 + (y - k)^2 = r^2$, centre $(h, k)$. |
| Arc length | $\dfrac{\theta}{360} \cdot 2\pi r$ |
| Tangent | Perpendicular to the radius at the point of contact. |

**Desmos check, step by step:**

1. Type $(x - 3)^2 + (y - 4)^2 = 25$.
2. Type the three points $(0, 0)$, $(6, 0)$ and $(0, 8)$. All three sit on the circle.

```desmos-open
(x-3)^2+(y-4)^2=25
(0,0)
(6,0)
(0,8)
```

## Worked example 1 (easy)

*Find the arc length cut off by a $60^\circ$ angle in a circle of radius $6$.*

1. Fraction of the circle: $\dfrac{60}{360} = \dfrac{1}{6}$.
2. Circumference: $2\pi(6) = 12\pi$. Arc: $\dfrac{1}{6} \cdot 12\pi = 2\pi$.

## Worked example 2 (SAT-level)

*The circle $x^2 + y^2 - 6x + 4y = 3$. What is its radius?*

1. Complete the square: $(x - 3)^2 - 9 + (y + 2)^2 - 4 = 3$.
2. So $(x - 3)^2 + (y + 2)^2 = 16$, and the radius is $4$.

## Common traps

- **Using the radius as the diameter.** Divide the diameter by two before using it.
- **Forgetting to add the completed squares to both sides.**
- **Using the tangent's slope in place of the radius's slope.** The tangent is the perpendicular one.

## The fast way (and when to use Desmos)

Graph the circle and the points or line in question. Tangents are easy to see: a line that touches the circle at one point. Use the centre and radius to build the equation exactly.
