---
skill: m-geo-circles
minutes: 11
---
## What school covered

Conic Sections taught you the standard circle equation $(x - h)^2 + (y - k)^2 = r^2$, how to read off the centre and radius, how to build the equation from a centre and a radius, and what happens to the circle when $h$, $k$ or $r$ changes. Classes 9 and 10 covered arcs, sectors and tangents. All of it is assumed.

## What school leaves out

CBSE almost always hands you the standard form. The SAT's circle questions live on the parts the syllabus skips: the general form, equations that transform, and radians mixed into arc questions. These are the SAT applications to learn here.

**Recover centre and radius from general form.** An equation like $x^2 + y^2 - 6x + 10y + 18 = 0$ is a circle in disguise. Group the $x$ terms and $y$ terms, complete the square twice, and read the centre and radius. This is the single most tested circle skill the syllabus skips.

**Completing the square, the fast way.** The coefficient of $x$ is $-6$, so half of it, $-3$, is the centre's $x$-coordinate, and its square $9$ is what you fold into that group. Check: $(x - 3)^2 = x^2 - 6x + 9$. Halve each linear coefficient, read the centre as the negatives of those halves, and move the leftover constants across to get $r^2$.

**Points and the equation.** A point is on the circle exactly when plugging it in satisfies the equation. Use that to test a claimed point, or to find an unknown: "the circle with centre $(1, -2)$ passes through $(4, 3)$" gives $r^2 = (4 - 1)^2 + (3 + 2)^2 = 34$, so the equation is $(x - 1)^2 + (y + 2)^2 = 34$.

**Transformations of the equation.** Replacing $(x - 3)^2$ with $(x - 5)^2$ moves the circle right by $2$. Growing $r^2$ from $16$ to $25$ grows the radius from $4$ to $5$. The SAT asks this as a sentence: "the circle is shifted 2 units right and its radius is doubled. What is the new equation?" Say each change as an edit to $h$, $k$ or $r$.

**Radian arcs, integrated.** Arc length is $r\theta$ with $\theta$ in radians, and sector area is $\tfrac{1}{2}r^2\theta$. CBSE introduced radians, but the SAT mixes units inside one question: decode a general-form equation to get $r$, convert a $40^\circ$ angle to $\dfrac{2\pi}{9}$, then compute the arc. Practise the conversion $\dfrac{\pi}{180}$ until it is automatic.

**Tangent lines from equations.** A line tangent to a circle at a point is perpendicular to the radius at that point. With the circle in standard form, the radius to $(x_1, y_1)$ has slope $\dfrac{y_1 - k}{x_1 - h}$, so the tangent slope is its negative reciprocal. The SAT combines this with your parallel and perpendicular work.

## Worked example

Find the centre and radius of $x^2 + y^2 - 6x + 10y + 18 = 0$.

Group: $(x^2 - 6x) + (y^2 + 10y) = -18$. Complete each square: $(x - 3)^2 - 9 + (y + 5)^2 - 25 = -18$. Move the constants: $(x - 3)^2 + (y + 5)^2 = 16$. Centre $(3, -5)$, radius $4$. Note the signs flip: $y + 5$ means the centre's $y$ is $-5$.

Then, a radians step: what is the arc length cut by a central angle of $\dfrac{\pi}{2}$ on this circle?

Arc $= r\theta = 4 \cdot \dfrac{\pi}{2} = 2\pi$. The same question with $90^\circ$ wants the conversion to $\dfrac{\pi}{2}$ first, then the same arithmetic. A $40^\circ$ angle on a radius-9 circle is $9 \cdot \dfrac{40\pi}{180} = 2\pi$ as well.

A tangent: find the tangent line to $(x - 3)^2 + (y + 5)^2 = 16$ at the point $(3, -1)$.

The point sits straight above the centre, so the radius is vertical and the tangent is horizontal: $y = -1$. Slope logic: the radius slope is $\dfrac{-1 - (-5)}{3 - 3}$, undefined, so the tangent slope is $0$.

## Common traps

- Reading $y + 5$ as centre $y = 5$. The standard form has minus signs, so flip.
- Stopping at $r^2 = 16$ and reporting the radius as $16$. Take the square root.
- Sign errors moving the constant across while completing the square; keep every group on one line until the squares are finished.
- Using degrees in $r\theta$. Convert first, every time.
- Halving the wrong coefficient when the equation has a coefficient on $x^2$. If the $x^2$ and $y^2$ coefficients differ, it is not a circle at all.

## Shortcuts and calculator checks

Centre coordinates are minus half the linear coefficients, so you can often answer a multiple-choice centre question with no algebra; verify once by completing the square. In Desmos, type the equation and hover or click the circle to check the centre and radius graphically before you commit.
