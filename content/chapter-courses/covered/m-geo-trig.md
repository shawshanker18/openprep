---
skill: m-geo-trig
minutes: 11
---
## What school covered

Class 10 gave you $\sin$, $\cos$ and $\tan$ in right triangles and heights-and-distances problems. Class 11 added radians, the unit circle with $(\cos\theta, \sin\theta)$, quadrant signs and $\sin^2\theta + \cos^2\theta = 1$. All of that is assumed; none of it needs re-teaching.

## What school leaves out

The SAT's trig is numerically neat on purpose, built on two special triangles the CBSE course never made you memorise, and it mixes ratios, circles and radians inside single questions. These are the applications to learn here.

**45-45-90 triangles.** Legs $1, 1$, hypotenuse $\sqrt{2}$. Every 45-45-90 triangle has sides $s, s, s\sqrt{2}$. This triangle is why $\sin 45^\circ = \dfrac{\sqrt{2}}{2}$, and half of a square's diagonal problem is this triangle.

**30-60-90 triangles.** Split an equilateral triangle of side $2$ down the middle: the half has sides $1, \sqrt{3}, 2$ opposite the $30^\circ, 60^\circ, 90^\circ$ angles. So $\sin 60^\circ = \dfrac{\sqrt{3}}{2}$ and $\cos 30^\circ = \dfrac{\sqrt{3}}{2}$. Every exact-value question comes from one of these two pictures.

**Ratios as side ratios in context.** A ramp, a kite string, a box diagonal: label the opposite and adjacent sides for the angle named, then write the ratio. The angle decides which side is "opposite", so re-label for every new angle the question names.

**A ratio plus the Pythagorean theorem.** Given $\sin\theta = \dfrac{3}{5}$ in a right triangle, the third side is $\sqrt{25 - 9} = 4$, so $\cos\theta = \dfrac{4}{5}$ and $\tan\theta = \dfrac{3}{4}$. The SAT asks this constantly because it tests whether you see the triangle behind the ratio. Scale matters too: $\sin\theta = \dfrac{3}{5}$ with hypotenuse $20$ means opposite side $12$.

**Radians inside circle questions.** An arc of $\dfrac{\pi}{3}$ radians is $60^\circ$, and the unit-circle point there is $\left(\dfrac{1}{2}, \dfrac{\sqrt{3}}{2}\right)$. Move between the fraction of $\pi$ and the special triangle without writing a proportion, then use signs: quadrant II flips the $x$-coordinate, quadrant IV flips the $y$-coordinate.

**Complementary angles as a shortcut.** $\sin x^\circ = \cos(90 - x)^\circ$. If $\sin x^\circ = \cos y^\circ$ with both acute, then $x + y = 90$. Also read cofunction pairs off the special triangles: $\sin 30^\circ = \cos 60^\circ$ because they are the two acute angles of the same triangle.

## Worked example

A right triangle has legs $5$ and $12$. What is $\sin$ of the smaller acute angle?

The hypotenuse is $\sqrt{25 + 144} = 13$. The smaller angle faces the smaller leg, $5$, so the sine is $\dfrac{5}{13}$. The trap is computing $\dfrac{5}{12}$, which is the tangent of the other angle.

Another: point $P$ on the unit circle is at angle $\dfrac{5\pi}{6}$.

The reference angle is $\dfrac{\pi}{6}$, where the special triangle gives $\cos = \dfrac{\sqrt{3}}{2}$ and $\sin = \dfrac{1}{2}$. Quadrant II means the $x$-coordinate flips sign: $P = \left(-\dfrac{\sqrt{3}}{2}, \dfrac{1}{2}\right)$. Size from the triangle, sign from the quadrant.

A ratio-plus-Pythagoras one: $\sin\theta = \dfrac{3}{5}$ and $\theta$ is acute. Find $\cos\theta$ and $\tan\theta$.

Scale the triangle to hypotenuse $5$: opposite $3$, adjacent $\sqrt{25 - 9} = 4$. So $\cos\theta = \dfrac{4}{5}$ and $\tan\theta = \dfrac{3}{4}$.

A radians-arc question: a circle has radius $10$ and a central angle of $\dfrac{2\pi}{5}$. Arc length is $10 \cdot \dfrac{2\pi}{5} = 4\pi$, and the same angle in degrees is $72^\circ$ if a picture asks for it.

## Common traps

- Swapping which leg is opposite when the question names a different angle. Redraw and mark the angle first.
- In 30-60-90 triangles, putting $\sqrt{3}$ on the short side. $\sqrt{3}$ pairs with $60^\circ$, the middle angle.
- Calculating the hypotenuse as $5 + 12$. Pythagorean theorem, not perimeter.
- Degree and radian mixups on the calculator. Set the mode before you start.
- Dropping the quadrant sign on unit-circle coordinates, or flipping the wrong coordinate in quadrants II and IV.

## Shortcuts and calculator checks

Memorise the two special triangles as pictures, not as lists of ratios; every exact-value question on the SAT comes from them. For any right-triangle question with unfamiliar numbers, draw it on paper, label all three sides from the two given, and let the picture name the ratio the question wants. In Desmos, `sin(θ)` plots let you confirm a sine value, but the pictures are faster for exact values.
