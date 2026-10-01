---
skill: m-geo-circles
minutes: 12
tags: [circle-measurements, arcs-sectors, angles-in-circles, circle-equations, radians]
---
## What this skill is

Circle questions ask for **circumference and area**, the length of an **arc** or the area of a **sector**, the measures of **angles in circles** (central and inscribed), and the **equation of a circle** in the $xy$-plane. Angles may be given in degrees or in **radians**.

## Key ideas

- Everything about a circle comes from its radius. If you are given a diameter, area, or circumference, find $r$ first.
- An arc or sector is a **fraction** of the whole circle: the central angle over $360^\circ$ (or over $2\pi$ radians).
- A **central angle** equals the measure of its arc. An **inscribed angle** (vertex on the circle) is **half** its intercepted arc.
- A radius drawn to a point of tangency is perpendicular to the tangent line.
- The equation $(x - h)^2 + (y - k)^2 = r^2$ describes a circle with center $(h, k)$ and radius $r$. If the equation is expanded, **complete the square** to get back to this form.

## Formulas and rules

$$C = 2\pi r \qquad A = \pi r^2 \qquad (x - h)^2 + (y - k)^2 = r^2$$

| Measure | Degrees ($\theta$) | Radians ($\theta$) |
|---|---|---|
| arc length | $\frac{\theta}{360} \cdot 2\pi r$ | $r\theta$ |
| sector area | $\frac{\theta}{360} \cdot \pi r^2$ | $\frac{1}{2} r^2 \theta$ |

- Inscribed angle $= \frac{1}{2} \times$ intercepted arc.
- Completing the square: $x^2 + 10x = (x + 5)^2 - 25$. Take half the coefficient, square it.

## Worked example 1 (easy)

A circle has radius $9$. Find the length of the arc and the area of the sector cut off by an $80^\circ$ central angle.

1. Fraction of the circle: $\frac{80}{360} = \frac{2}{9}$.
2. Arc length: $\frac{2}{9} \cdot 2\pi(9) = \frac{2}{9} \cdot 18\pi = 4\pi$.
3. Sector area: $\frac{2}{9} \cdot \pi(9)^2 = \frac{2}{9} \cdot 81\pi = 18\pi$.

Check with radians: $80^\circ = \frac{4\pi}{9}$, and $r\theta = 9 \cdot \frac{4\pi}{9} = 4\pi$. Correct.

## Worked example 2 (SAT-level)

*A circle in the $xy$-plane has equation $x^2 + y^2 + 10x - 4y = 7$. What are its center and radius?*

1. Group the terms: $(x^2 + 10x) + (y^2 - 4y) = 7$.
2. Complete each square: $x^2 + 10x = (x + 5)^2 - 25$ and $y^2 - 4y = (y - 2)^2 - 4$.
3. Substitute: $(x + 5)^2 - 25 + (y - 2)^2 - 4 = 7$, so $(x + 5)^2 + (y - 2)^2 = 36$.
4. The center is $(-5, 2)$ and the radius is $\sqrt{36} = 6$.

Check: the point $(1, 2)$ is $6$ units right of the center, so it should be on the circle: $1 + 4 + 10 - 8 = 7$. Correct.

## Common traps

- **Forgetting the square root.** In $(x - 3)^2 + (y + 1)^2 = 64$, the radius is $8$, not $64$.
- **Center sign errors.** $(x + 5)^2$ means $h = -5$. The center has the *opposite* signs of the numbers in the parentheses.
- **Not adding the completed squares to both sides.** When you add $25$ and $4$ on the left, add them on the right too: $7 + 25 + 4 = 36$.
- **Using the diameter in $\pi r^2$.** A diameter of $14$ gives an area of $49\pi$.
- **Treating an inscribed angle like a central angle.** An inscribed angle intercepting a $140^\circ$ arc measures $70^\circ$.
- **Mixing units.** Use $\frac{\theta}{360}$ with degrees and $r\theta$ with radians, never a mix.

## The fast way (and when to use Desmos)

Desmos graphs circle equations in any form, expanded or not:

- **Center and radius:** type $x^2 + y^2 + 10x - 4y = 7$ exactly as given. Zoom in and read the center and radius from the grid; the leftmost and rightmost points are a diameter apart.
- **Check an answer choice:** graph the given equation and each choice. The correct choice draws exactly on top of it.
- **Does a point lie on the circle?** Type the point, such as $(1, 2)$, and see whether it sits on the curve.

For arcs and sectors, skip Desmos: write the fraction of the circle, multiply, and keep answers in terms of $\pi$. Completing the square by hand is also quick when the coefficients are even, as in example 2.
