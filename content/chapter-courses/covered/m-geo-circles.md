---
skill: m-geo-circles
minutes: 9
---
## What school covered

Conic Sections taught you the standard circle equation $(x - h)^2 + (y - k)^2 = r^2$, how to read off the centre and radius, how to build the equation from a centre and a radius, and what happens to the circle when $h$, $k$ or $r$ changes. Classes 9 and 10 covered arcs, sectors and tangents. All of it is assumed.

## What school leaves out

CBSE almost always hands you the standard form. The SAT loves the general form, and it mixes radians and degrees into arc questions, so that is the material to learn here.

- **Recover centre and radius from general form.** An equation like $x^2 + y^2 - 6x + 10y + 18 = 0$ is a circle in disguise. Group the $x$ terms and $y$ terms, complete the square twice, and read the centre and radius. This is the single most tested circle skill the syllabus skips.
- **Completing the square, the fast way.** The coefficient of $x$ is $-6$, so half of it, $-3$, is the centre's $x$-coordinate, and $(-3)^2 = 9$ is what you add to that group. Check: $(x - 3)^2 = x^2 - 6x + 9$. Halve the linear coefficient, that is the centre coordinate, and its square is the constant you fold in.
- **Radian arcs on the SAT.** Arc length is $r\theta$ with $\theta$ in radians, and sector area is $\tfrac{1}{2}r^2\theta$. CBSE introduced radians, but the SAT asks you to jump between degrees and radians inside one question, for example an arc given as $40^\circ$ on a circle whose equation you just decoded.
- **Transformations of the equation.** Replacing $(x - 3)^2$ with $(x - 5)^2$ moves the circle right by $2$. Growing $r^2$ from $16$ to $25$ grows the radius from $4$ to $5$. Say the change as a sentence: what moved, and by how much.
- **Points and the equation.** A point is on the circle exactly when plugging it in satisfies the equation. Use that to test points or to find an unknown constant in the equation.

## Worked example

Find the centre and radius of $x^2 + y^2 - 6x + 10y + 18 = 0$.

Group: $(x^2 - 6x) + (y^2 + 10y) = -18$. Complete each square: $(x - 3)^2 - 9 + (y + 5)^2 - 25 = -18$. Move the constants: $(x - 3)^2 + (y + 5)^2 = 16$. Centre $(3, -5)$, radius $4$. Note the signs flip: $y + 5$ means the centre's $y$ is $-5$.

Then, a radians step: what is the arc length cut by a central angle of $\dfrac{\pi}{2}$ on this circle?

Arc $= r\theta = 4 \cdot \dfrac{\pi}{2} = 2\pi$. The same question with $90^\circ$ wants the conversion $\dfrac{\pi}{2}$ first, then the same arithmetic.

## Common traps

- Reading $y + 5$ as centre $y = 5$. The standard form has minus signs, so flip.
- Stopping at $r^2 = 16$ and reporting the radius as $16$. Take the square root.
- Sign errors when moving the constant across while completing the square; keep every group on one line until the squares are finished.
- Using degrees in $r\theta$. Convert first, every time.
- Halving the wrong coefficient when the equation has a coefficient on $x^2$. If the $x^2$ and $y^2$ coefficients differ, it is not a circle at all.

## Shortcuts and calculator checks

Centre coordinates are minus half the linear coefficients, so you can often answer a multiple-choice centre question with no algebra at all; verify by completing the square once. In Desmos, type the equation and hover or click the circle to check the centre and radius graphically before you commit.
