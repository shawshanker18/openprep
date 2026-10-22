---
skill: m-geo-trig
minutes: 9
---
## What school covered

Class 10 gave you $\sin$, $\cos$ and $\tan$ in right triangles and heights-and-distances problems. Class 11 added radians, the unit circle with $(\cos\theta, \sin\theta)$, quadrant signs and $\sin^2\theta + \cos^2\theta = 1$. All of that is assumed; none of it needs re-teaching.

## What school leaves out

The SAT's trig is numerically neat on purpose, built on two special triangles the CBSE course never made you memorise, and it mixes all of this with circles and radians in single questions.

- **45-45-90 triangles.** Legs $1, 1$, hypotenuse $\sqrt{2}$. Sides are $s, s, s\sqrt{2}$. This triangle is why $\sin 45^\circ = \dfrac{\sqrt{2}}{2}$.
- **30-60-90 triangles.** Sides come from an equilateral triangle of side $2$ split in half: $1, \sqrt{3}, 2$ opposite the $30^\circ, 60^\circ, 90^\circ$ angles. So $\sin 60^\circ = \dfrac{\sqrt{3}}{2}$ and $\cos 30^\circ = \dfrac{\sqrt{3}}{2}$.
- **Ratios as side ratios in context.** A ramp, a kite string or a diagonal of a box: label the opposite and adjacent sides for the angle named, then write the ratio. The angle decides which side is "opposite", so re-label for every new angle.
- **A ratio plus the Pythagorean theorem.** Given $\sin\theta = \dfrac{3}{5}$ in a right triangle, the third side is $\sqrt{25 - 9} = 4$, so $\cos\theta = \dfrac{4}{5}$ and $\tan\theta = \dfrac{3}{4}$. The SAT asks this constantly because it tests whether you see a triangle behind the ratio.
- **Radians inside circle questions.** An arc of $\dfrac{\pi}{3}$ radians corresponds to $60^\circ$, and the point on the unit circle there is $\left(\dfrac{1}{2}, \dfrac{\sqrt{3}}{2}\right)$. Move between the fraction of $\pi$ and the special triangle without writing a proportion.
- **Complementary angles as a shortcut.** $\sin x^\circ = \cos(90 - x)^\circ$. If $\sin x^\circ = \cos y^\circ$ with both acute, then $x + y = 90$.

## Worked example

A right triangle has legs $5$ and $12$. What is $\sin$ of the smaller acute angle?

The hypotenuse is $\sqrt{25 + 144} = 13$. The smaller angle faces the smaller leg, $5$, so the sine is $\dfrac{5}{13}$. The trap is computing $\dfrac{5}{12}$, which is the tangent of the other angle.

Another: point $P$ on the unit circle is at angle $\dfrac{5\pi}{6}$.

The reference angle is $\dfrac{\pi}{6}$, where the special triangle gives $\cos = \dfrac{\sqrt{3}}{2}$ and $\sin = \dfrac{1}{2}$. Quadrant II means the $x$-coordinate flips sign: $P = \left(-\dfrac{\sqrt{3}}{2}, \dfrac{1}{2}\right)$. Size from the triangle, sign from the quadrant.

## Common traps

- Swapping which leg is opposite when the question names a different angle. Redraw and mark the angle first.
- In 30-60-90 triangles, putting $\sqrt{3}$ on the short side. $\sqrt{3}$ pairs with $60^\circ$, the middle angle.
- Calculating the hypotenuse as $5 + 12$. Pythagorean theorem, not perimeter.
- Degree and radian mixups on the calculator. Set the mode before you start.
- Dropping the quadrant sign on unit-circle coordinates, or flipping the wrong coordinate in quadrants II and IV.

## Shortcuts and calculator checks

Memorise the two special triangles as pictures, not as lists of ratios; every exact-value question on the SAT comes from them. For any right-triangle question with unfamiliar numbers, draw it in Desmos or on paper, label all three sides from the two given, and let the picture name the ratio the question wants.
