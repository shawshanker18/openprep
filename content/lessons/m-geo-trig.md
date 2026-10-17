---
skill: m-geo-trig
minutes: 13
tags: [pythagorean-theorem, trig-ratios, special-right-triangles, complementary-angles, radians, unit-circle]
---
## What this skill is

This skill covers right triangles and the basics of trigonometry: the **Pythagorean theorem**, the **trig ratios** sine, cosine, and tangent, the **special right triangles** ($45$-$45$-$90$ and $30$-$60$-$90$), the link between sine and cosine of **complementary angles**, and angles measured in **radians** on the **unit circle**.

> **Build the ratio first.** The SAT gives you a triangle and asks for a side or angle, so write the trig relationship before computing.
>
> 1. Name the side or angle you know, and the one you want.
> 2. Write the ratio: a $12$-foot ramp at $30^\circ$ rises $12\sin 30^\circ$.
> 3. Evaluate only after the ratio is written.

## Key ideas

- In a right triangle, the hypotenuse is the longest side and sits opposite the right angle.
- Each trig ratio compares two sides **relative to a chosen acute angle**: opposite, adjacent, and hypotenuse change when you switch angles.
- The two acute angles of a right triangle are complementary (they add to $90^\circ$), so the side opposite one is adjacent to the other. That is why $\sin x^\circ = \cos(90 - x)^\circ$.
- If you know one trig ratio, sketch a triangle with those side lengths, find the third side with the Pythagorean theorem, and read off any other ratio.
- Radians measure angles by arc length on a circle of radius $1$: $\pi$ radians $= 180^\circ$.

## Formulas and rules

$$a^2 + b^2 = c^2 \qquad \sin\theta = \frac{\text{opp}}{\text{hyp}} \quad \cos\theta = \frac{\text{adj}}{\text{hyp}} \quad \tan\theta = \frac{\text{opp}}{\text{adj}}$$

| Triangle | Side ratios |
|---|---|
| $45^\circ$-$45^\circ$-$90^\circ$ | $x : x : x\sqrt{2}$ |
| $30^\circ$-$60^\circ$-$90^\circ$ | $x : x\sqrt{3} : 2x$ (short leg opposite $30^\circ$) |

- Common Pythagorean triples: $3$-$4$-$5$, $5$-$12$-$13$, $8$-$15$-$17$, $7$-$24$-$25$, and their multiples.
- Degrees to radians: multiply by $\frac{\pi}{180}$. So $60^\circ = \frac{\pi}{3}$ and $300^\circ = \frac{5\pi}{3}$.
- Unit circle: a point at angle $\theta$ is $(\cos\theta, \sin\theta)$. Sine is negative below the $x$-axis; cosine is negative left of the $y$-axis. Example: $\frac{5\pi}{3}$ is $300^\circ$, with reference angle $60^\circ$ in the fourth quadrant, so $\sin\frac{5\pi}{3} = -\frac{\sqrt{3}}{2}$.

### Special angles

Memorize $\sin$, $\cos$, and $\tan$ at $30^\circ$, $45^\circ$, and $60^\circ$ from the special triangles above. A $30^\circ$-$60^\circ$-$90^\circ$ triangle with hypotenuse $2x$ has short leg $x$, so $\sin 30^\circ = \dfrac{1}{2}$ and $\cos 30^\circ = \dfrac{\sqrt{3}}{2}$.

**Desmos way:** type $\sin(30)$ in degree mode. Desmos shows $0.5$, which matches the special triangle. Check the other two the same way.

### Equilateral triangles

An equilateral triangle with side $s$ has height $\dfrac{s\sqrt{3}}{2}$. For height $29\sqrt{3}$, the side is $\dfrac{2 \cdot 29\sqrt{3}}{\sqrt{3}} = 58$.

**Desmos way:** type $\dfrac{2 \cdot 29\sqrt{3}}{\sqrt{3}}$. Desmos shows $58$.

### Angles beyond one turn

Angles repeat every $2\pi$ radians (or $360^\circ$). $11\pi$ radians is $11 \cdot 180^\circ = 1980^\circ$. Also $\tan(2\pi) = \dfrac{\sin 2\pi}{\cos 2\pi} = \dfrac{0}{1} = 0$.

**Desmos way:** in radian mode, type $\tan(2\pi)$. Desmos shows $0$, the same answer as the ratio.

### Values at multiples of $\pi$

On the unit circle, $\cos\theta$ is the $x$-coordinate and $\sin\theta$ is the $y$-coordinate. At $\theta = \pi$ the point is $(-1, 0)$, so $\cos\pi = -1$, and $3\pi$ lands on the same point, so $\cos 3\pi = -1$. For $\dfrac{7\pi}{4}$, the reference angle is $\dfrac{\pi}{4}$ in quadrant IV, so $\cos\dfrac{7\pi}{4} = \dfrac{\sqrt{2}}{2}$.

**Desmos way:** graph the unit circle $x^2 + y^2 = 1$ with the point at $\dfrac{7\pi}{4}$. The point is in quadrant IV, with $x \approx 0.71$, so cosine is positive there.

```desmos
x^2+y^2=1
(\cos(\frac{7\pi}{4}),\sin(\frac{7\pi}{4}))
```

## Worked example 1 (easy)

A right triangle has legs $7$ and $24$. Find the hypotenuse, and find $\sin\theta$, $\cos\theta$, and $\tan\theta$ for the angle $\theta$ opposite the side of length $7$.

1. $c^2 = 7^2 + 24^2 = 49 + 576 = 625$, so $c = 25$.
2. Opposite $\theta$ is $7$, adjacent is $24$: $\sin\theta = \frac{7}{25}$, $\cos\theta = \frac{24}{25}$, $\tan\theta = \frac{7}{24}$.

Check: $\left(\frac{7}{25}\right)^2 + \left(\frac{24}{25}\right)^2 = \frac{49 + 576}{625} = 1$. Correct.

**Desmos method:** in degree mode, type $\sqrt{7^2 + 24^2}$, which shows $25$, and $\dfrac{7}{25}$, which shows $0.28$. These match the hand work.

```desmos
\sqrt{7^2+24^2}
\frac{7}{25}
```

## Worked example 2 (SAT-level)

*In right triangle $JKL$, angle $K$ is the right angle and $\tan J = \frac{8}{15}$. What is $\cos L$?*

1. Relative to $J$: opposite side $KL = 8$, adjacent side $JK = 15$.
2. Hypotenuse: $JL = \sqrt{8^2 + 15^2} = \sqrt{289} = 17$.
3. Relative to $L$, the adjacent leg is $KL = 8$. So $\cos L = \frac{8}{17}$.

Check: $J$ and $L$ are complementary, so $\cos L = \sin J = \frac{8}{17}$. Correct.

**Desmos method:** type $\sqrt{8^2 + 15^2}$, which shows $17$, then $\dfrac{8}{17}$, which shows $\approx 0.47$. In degree mode, $\arctan\left(\dfrac{8}{15}\right) \approx 28.07^\circ$, and $\cos(90 - 28.07)^\circ$ matches $\dfrac{8}{17}$.

## Common traps

- **Reading sides from the wrong angle.** "Opposite" and "adjacent" depend on which angle you are using; relabel when the question switches angles.
- **Adding the wrong squares.** The hypotenuse goes alone on one side: a leg is $\sqrt{c^2 - a^2}$, not $\sqrt{c^2 + a^2}$.
- **Mixing up the $30$-$60$-$90$ legs.** The short leg is opposite $30^\circ$; the leg opposite $60^\circ$ is $\sqrt{3}$ times it.
- **Complementary vs. supplementary.** $\sin x^\circ = \cos y^\circ$ means $x + y = 90$, not $180$.
- **Ignoring the sign on the unit circle.** $\sin\frac{4\pi}{3}$ is negative because the angle points below the $x$-axis.

## The fast way (and when to use Desmos)

Know the triples and special triangles by heart, and most questions become a quick ten second sketch. Desmos is useful for checking:

- **Set the angle mode first.** Desmos uses radians by default; open the settings (wrench) and choose Degrees for degree questions.
- **Check a ratio:** type $\cos(25)$ and $\sin(65)$ in degree mode and confirm they match, or compare a decimal like $\frac{8}{17} \approx 0.47$ against the choices.
- **Radian values:** in radian mode, type $\sin\left(\frac{11\pi}{6}\right)$ and read $-0.5$.
- **Unknown side with an angle:** compute directly: a $12$-foot ramp at $30^\circ$ rises $12\sin(30) = 6$ feet (degree mode).

Use the special-triangle ratios instead of the calculator when the answer choices contain $\sqrt{2}$ or $\sqrt{3}$, because the decimals are harder to match than the exact forms.
