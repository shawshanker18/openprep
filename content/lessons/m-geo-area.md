---
skill: m-geo-area
minutes: 11
tags: [area, volume, surface-area, scaling]
---
## What this skill is

This skill covers the **area** of flat shapes, the **volume** and **surface area** of solids, and how these measures change when a figure is **scaled**. The SAT gives you a reference sheet with most formulas, so the challenge is choosing the right one, finding missing dimensions, and handling composite figures and unit changes.

## Key ideas

- Area is measured in square units; volume in cubic units. Keep track of which one the question wants.
- **Composite figures:** split into familiar pieces (rectangles, triangles, semicircles), then add or subtract.
- **Cones and pyramids** hold exactly $\frac{1}{3}$ of the matching cylinder or prism.
- Surface area is the total area of all faces. A cube with edge $s$ has $6$ square faces, so its surface area is $6s^2$.
- If every length is multiplied by $k$, areas are multiplied by $k^2$ and volumes by $k^3$.
- When only some dimensions change (for example, the radius doubles and the height is cut in half), substitute into the formula rather than using one scale factor.

## Formulas and rules

| Shape | Area or volume |
|---|---|
| rectangle / triangle | $A = lw$ / $A = \frac{1}{2}bh$ |
| circle | $A = \pi r^2$ |
| rectangular prism | $V = lwh$ |
| cylinder | $V = \pi r^2 h$ |
| cone / pyramid | $V = \frac{1}{3}\pi r^2 h$ / $V = \frac{1}{3}lwh$ |
| sphere | $V = \frac{4}{3}\pi r^3$ |

- Similar solids with surface areas in ratio $4 : 9$ have lengths in ratio $2 : 3$ and volumes in ratio $8 : 27$.
- $1$ liter $= 1{,}000$ cm$^3$.

## Worked example 1 (easy)

A closed box is $8$ cm long, $5$ cm wide, and $3$ cm tall. Find its volume and surface area.

1. Volume: $8 \times 5 \times 3 = 120$ cm$^3$.
2. Surface area: three pairs of faces, $2(8 \cdot 5 + 8 \cdot 3 + 5 \cdot 3) = 2(40 + 24 + 15) = 158$ cm$^2$.

Check: the faces are $40$, $40$, $24$, $24$, $15$, and $15$, which add to $158$. Correct.

## Worked example 2 (SAT-level)

*A solid metal cylinder with radius $4$ and height $9$ is melted and recast as a cone with radius $4$. What is the height of the cone?*

1. The volume stays the same. Cylinder: $\pi (4)^2 (9) = 144\pi$.
2. Cone: $\frac{1}{3}\pi (4)^2 h = \frac{16}{3}\pi h$.
3. Set them equal: $\frac{16}{3}\pi h = 144\pi$, so $h = 144 \cdot \frac{3}{16} = 27$.

Check: with the same base, a cone needs $3$ times the cylinder's height to hold the same volume, and $3 \times 9 = 27$. Correct.

## Common traps

- **Using the diameter as the radius.** A circle with diameter $10$ has area $25\pi$, not $100\pi$.
- **Forgetting the $\frac{1}{3}$** for cones and pyramids.
- **Scaling volume by $k$ instead of $k^3$.** Doubling every edge of a box multiplies its volume by $8$.
- **Using slant height as height.** In a cone, the height is perpendicular to the base. If you are given the slant height, use the Pythagorean theorem with the radius first.
- **Counting a shared side twice** in a composite figure, or forgetting that a semicircle is half a circle's area.

## The fast way (and when to use Desmos)

Most of these questions are one formula plus careful arithmetic, so a clear setup beats any tool. Write the formula, substitute, then simplify — and leave $\pi$ in until the end, since answers are often written as $k\pi$.

Desmos helps in two spots:

- **Arithmetic with $\pi$:** type $\frac{1}{3}\pi \cdot 4^2 \cdot 27$ to confirm a volume numerically, and compare with a choice like $144\pi$.
- **Solving for a missing dimension:** to find a radius from a volume, graph $y = \frac{4}{3}\pi x^3$ and $y = 288\pi$, then click the intersection ($x = 6$).

For scaling questions, skip formulas entirely: find the length ratio $k$, then use $k^2$ for area and $k^3$ for volume.
