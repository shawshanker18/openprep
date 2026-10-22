---
skill: m-geo-area
minutes: 12
tags: [composite-figures, scaling, volume, cones]
---
## What this skill is

Area and volume questions combine formulas for simple shapes. At mastery level you split a complex figure into pieces, reason about how a change in one dimension affects the whole, and compare shapes.

> **Split the figure first.** Name the simple shapes it is made of, then decide whether to add or subtract their volumes.

## Learn the idea

**Try this first.** If the radius of a sphere doubles, does its volume double?

**Let's reason it through.**

1. The sphere's volume is $\dfrac{4}{3}\pi r^3$. Why the cube? Volume depends on the cube of the radius, because the sphere grows in three directions at once.
2. Double the radius: $\dfrac{4}{3}\pi (2r)^3 = \dfrac{4}{3}\pi \cdot 8r^3$.
3. The new volume is $8$ times the old one, not $2$ times.
4. The general rule: scaling every length by $k$ multiplies volume by $k^3$.

**Your turn.** A cone has height $12$ and radius $5$. The liquid inside fills it to half its height. What fraction of the cone's volume is the liquid?

**Answer:** Halving the height halves every linear dimension of the liquid's cone. Volume scales with the cube, so the liquid is $\left(\tfrac{1}{2}\right)^3 = \tfrac{1}{8}$ of the full cone.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Sphere | $V = \dfrac{4}{3}\pi r^3$ |
| Cone | $V = \dfrac{1}{3}\pi r^2 h$ |
| Scaling | Length factor $k$: areas multiply by $k^2$ and volumes by $k^3$. |
| Composite solid | Add the volumes of the parts, or subtract a removed part. |

**Desmos check, step by step:**

1. Type $y = \dfrac{4}{3}\pi x^3$ to see sphere volume against radius.
2. Type $y = \dfrac{4}{3}\pi (2x)^3$. The second curve is eight times higher at every radius, which confirms the cube rule.

```desmos-open
y=\frac{4}{3}\pi x^3
y=\frac{4}{3}\pi (2x)^3
```

## Worked example 1 (easy)

*A ring-shaped prism has outer radius $5$ cm, inner radius $3$ cm, and height $2$ cm. Find its volume.*

1. The ring is the outer cylinder minus the inner cylinder.
2. Volume: $\pi(5^2 - 3^2)(2) = \pi(25 - 9)(2) = 32\pi$ cm$^3$.

## Worked example 2 (SAT-level)

*A cone has height $12$ and radius $5$. What is its volume?*

1. $V = \dfrac{1}{3}\pi(5)^2(12) = \dfrac{1}{3}\pi(25)(12) = 100\pi$.
2. Check: a cone is one third of the cylinder with the same base and height, and the cylinder would be $300\pi$.

## Common traps

- **Forgetting to subtract a hollow part.** A ring is the outer solid minus the inner one.
- **Scaling volume by $k$ instead of $k^3$.** Doubling every edge of a box multiplies its volume by $8$.
- **Mixing the radius and diameter.** Check which one the formula needs.

## The fast way (and when to use Desmos)

Write the formula for each part, then add or subtract. For scaling questions, find the length factor and apply the square or cube. Desmos checks any numeric value you computed.
