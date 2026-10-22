---
skill: m-psda-ratios
minutes: 11
tags: [rates, combined-rates, unit-conversion, scale]
---
## What this skill is

Rates and ratios describe how quantities relate. At mastery level you combine rates from several sources, convert across units in a chain, and apply scales to areas as well as lengths.

> **Write the chain first.** Put the given rate, then each conversion, so that every unit cancels except the one you want.

## Learn the idea

**Try this first.** One tap fills a tank in $4$ hours and another in $6$ hours. How long do they take together?

**Let's reason it through.**

1. Each tap contributes a rate: $\tfrac{1}{4}$ of the tank per hour and $\tfrac{1}{6}$ per hour. Why add the rates and not the times? Work done per hour adds up, while the times do not.
2. Together: $\tfrac{1}{4} + \tfrac{1}{6} = \tfrac{5}{12}$ of the tank per hour.
3. Time for one full tank: $\dfrac{1}{5/12} = \dfrac{12}{5} = 2.4$ hours.
4. Check: together they should be faster than the faster tap alone, $4$ hours. $2.4$ is less, so it fits.

**Your turn.** A map scale is $1$ cm to $5$ km. A region is $4$ cm$^2$ on the map. What is its real area?

**Answer:** Areas scale by the square of the length factor. The factor is $5$, so the area is $4 \cdot 5^2 = 100$ km$^2$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Combined rates | Rates add: $r_1 + r_2$. Times do not add. |
| Time for a job | $t = \dfrac{\text{job}}{r_1 + r_2}$ |
| Unit chain | Multiply by fractions equal to $1$ so the old unit cancels. |
| Area scale | Length factor $k$ gives area factor $k^2$. |

**Desmos check, step by step:**

1. Type $y = \dfrac{1}{4}x + \dfrac{1}{6}x$, the combined rate of both taps.
2. Type $y = 1$. Where the line crosses $y = 1$, the x value is the time to fill the tank, $2.4$ hours.

```desmos-open
y=\frac{1}{4}x+\frac{1}{6}x
y=1
```

## Worked example 1 (easy)

*Convert $60$ miles per hour to metres per second, using $1$ mile $= 1609$ metres.*

1. Chain: $\dfrac{60 \text{ mi}}{1 \text{ h}} \cdot \dfrac{1609 \text{ m}}{1 \text{ mi}} \cdot \dfrac{1 \text{ h}}{3600 \text{ s}}$.
2. The miles and hours cancel: $\dfrac{60 \cdot 1609}{3600} \approx 26.8$ metres per second.

## Worked example 2 (SAT-level)

*A recipe uses $3$ cups of flour for every $2$ cups of sugar. If you use $12$ cups of flour, how much sugar do you need, and what is the total?*

1. Set up the proportion: $\dfrac{3}{2} = \dfrac{12}{s}$, so $3s = 24$ and $s = 8$.
2. Total: $12 + 8 = 20$ cups.

## Common traps

- **Adding the times instead of the rates.**
- **Scaling area by the length factor instead of its square.**
- **Dropping a unit in a chain.** Check that each unit cancels.

## The fast way (and when to use Desmos)

Write the chain once and multiply through. For combined rates, add the rates and invert. Use Desmos to check a decimal answer against the setup.
