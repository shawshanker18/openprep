---
skill: m-geo-trig
minutes: 13
tags: [trig-in-context, radians, unit-circle, pythagoras]
---
## What this skill is

Trigonometry links an angle to side lengths. At mastery level you use it in a situation, choose the ratio that fits the known and unknown sides, and move between the unit circle and the triangle.

> **Choose the ratio first.** Identify the known side and the unknown side relative to the angle, then pick sine, cosine or tangent.

## Learn the idea

**Try this first.** A ladder $10$ feet long leans against a wall at $60^\circ$ to the ground. How high up the wall does it reach?

**Let's reason it through.**

1. The ladder is the hypotenuse. The height is the side opposite the $60^\circ$ angle. Why sine? Sine is opposite over hypotenuse, and both sides are known in form.
2. Write the ratio: $\sin 60^\circ = \dfrac{h}{10}$, so $h = 10 \sin 60^\circ$.
3. Use $\sin 60^\circ = \dfrac{\sqrt{3}}{2}$: $h = 5\sqrt{3} \approx 8.66$ feet.
4. Check the size: a $60^\circ$ ladder is steep but not vertical, so the height is less than $10$. $8.66$ fits.

**Your turn.** In the first quadrant, $\sin\theta = 0.6$. Find $\cos\theta$.

**Answer:** Use $\sin^2\theta + \cos^2\theta = 1$: $\cos^2\theta = 1 - 0.36 = 0.64$, so $\cos\theta = 0.8$. In the first quadrant cosine is positive.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Ratios | $\sin = \dfrac{\text{opp}}{\text{hyp}}$, $\cos = \dfrac{\text{adj}}{\text{hyp}}$, $\tan = \dfrac{\text{opp}}{\text{adj}}$ |
| Pythagorean identity | $\sin^2\theta + \cos^2\theta = 1$ |
| Radians | $\pi$ radians is $180^\circ$. |

**Desmos check, step by step:**

1. Type $x^2 + y^2 = 1$ to draw the unit circle.
2. Type the point $(\cos(\tfrac{\pi}{3}), \sin(\tfrac{\pi}{3}))$. It sits at $(0.5, 0.87)$, the $60^\circ$ point.

```desmos-open
x^2+y^2=1
(\cos(\frac{\pi}{3}),\sin(\frac{\pi}{3}))
```

## Worked example 1 (easy)

*A right triangle has legs $5$ and $12$. Find $\sin$ of the angle opposite the $5$.*

1. Hypotenuse: $\sqrt{5^2 + 12^2} = 13$.
2. Sine is opposite over hypotenuse: $\sin = \dfrac{5}{13}$.

## Worked example 2 (SAT-level)

*A ramp $20$ metres long rises at $15^\circ$. How high does it rise, to the nearest tenth?*

1. The ramp is the hypotenuse, and the height is opposite the angle: $\sin 15^\circ = \dfrac{h}{20}$.
2. So $h = 20 \sin 15^\circ \approx 20(0.2588) \approx 5.18$ metres.
3. Round to the nearest tenth: $5.2$ metres.

## Common traps

- **Choosing the wrong ratio.** Opposite and adjacent depend on the angle you chose.
- **Using degrees in radian mode.** Check the mode before you evaluate.
- **Forgetting the quadrant sign.** A sine can be negative below the horizontal axis.

## The fast way (and when to use Desmos)

Draw the triangle and label the sides relative to the angle. Use the unit circle to check signs and special values. Desmos evaluates the ratio once you have written it correctly.
