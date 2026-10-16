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

### The radius from two points

The radius is the distance from the center to any point on the circle. For center $(-4, 1)$ and point $(8, 6)$: $r = \sqrt{12^2 + 5^2} = 13$, so the equation is $(x + 4)^2 + (y - 1)^2 = 169$.

### A diameter given by its endpoints

The center is the midpoint of the endpoints, and the radius is half the distance between them. For endpoints $(-29, 47)$ and $(19, -17)$: the midpoint is $(-5, 15)$ and the distance is $\sqrt{48^2 + 64^2} = 80$, so $r = 40$ and the equation is $(x + 5)^2 + (y - 15)^2 = 1600$.

### Translating a circle

Shifting a circle right by $h$ replaces $x$ with $x - h$ in its equation. Circle $(x + 2)^2 + (y - 8)^2 = 9$ moved right $6$ units becomes $(x - 4)^2 + (y - 8)^2 = 9$.

### A leading coefficient other than 1

Divide the whole equation by the coefficient of $x^2$ before completing the square. For $16x^2 + 16y^2 - 8x - 24y - 15 = 0$, divide by $16$ to get $x^2 + y^2 - \dfrac{1}{2}x - \dfrac{3}{2}y = \dfrac{15}{16}$. The center is $\left(\dfrac{1}{4}, \dfrac{3}{4}\right)$ and $r^2 = \dfrac{25}{16}$, so $r = \dfrac{5}{4}$.

### Tangent lines

A tangent line is perpendicular to the radius at the point of tangency. Find the slope of the radius from the center to that point, then use the negative reciprocal. For center $(-4, 3)$ and point $(2, -5)$, the radius has slope $\dfrac{-5 - 3}{2 + 4} = -\dfrac{4}{3}$, so the tangent has slope $\dfrac{3}{4}$.

### Working backward from arc length or sector area

An arc of length $L$ with central angle $\theta$ (in degrees) satisfies $L = \dfrac{\theta}{360} \cdot 2\pi r$, so $r = \dfrac{360L}{2\pi\theta}$. Sector area works the same way.

### Shaded regions

Shaded areas are usually a sector minus a triangle, or a circle minus a sector. Find each piece, then subtract.

### General form to radius

$x^2 + y^2 + 8x - 14y + 49 = 0$ becomes $(x + 4)^2 + (y - 7)^2 = 16$, so the radius is $4$.

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
