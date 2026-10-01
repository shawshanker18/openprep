---
skill: m-psda-ratios
minutes: 10
tags: [proportions, rates, unit-conversion, scale]
---
## What this skill is

Ratios compare quantities, rates compare quantities with different units (miles per hour, dollars per pound), and proportions say two ratios are equal. The SAT tests setting up proportions, working with rates, converting units (often through several steps), reading map or model scales, and combining rates when two things work together.

## Key ideas

- A proportion $\frac{a}{b} = \frac{c}{d}$ only works if both ratios compare the same things in the same order.
- A **unit rate** (the amount for one unit) turns most rate problems into a single multiplication.
- In a ratio of $5 : 3$, the quantities are $5k$ and $3k$ for some number $k$. The total is $8k$.
- Unit conversion is multiplying by fractions equal to $1$, such as $\frac{60 \text{ min}}{1 \text{ hr}}$. Arrange each fraction so unwanted units cancel.
- When two machines or workers act together, **rates add** (bottles per hour); times do not.

## Formulas and rules

$$\text{distance} = \text{rate} \times \text{time} \qquad \text{amount} = \text{rate} \times \text{time}$$

| Situation | Method |
|---|---|
| "$4$ cups for every $3$ cups" | $\frac{4}{3} = \frac{x}{9}$, cross-multiply |
| Scale: $1$ cm $= 1.5$ km | multiply map distance by $1.5$ |
| Density | $\text{density} = \frac{\text{mass}}{\text{volume}}$ |
| Working together | combined rate $= r_1 + r_2$, time $= \frac{\text{job}}{r_1 + r_2}$ |

- Area scales by the square of a length scale; $1$ m$^2 = 10{,}000$ cm$^2$, not $100$ cm$^2$.

## Worked example 1 (easy)

Five notebooks cost \$8.75. At the same price per notebook, how much do $12$ notebooks cost?

1. Unit rate: $8.75 \div 5 = 1.75$, so each notebook costs \$1.75.
2. Multiply: $12 \times 1.75 = 21$. The cost is \$21.

Check with a proportion: $\frac{8.75}{5} = \frac{x}{12}$ gives $5x = 105$, so $x = 21$. Correct.

## Worked example 2 (SAT-level)

*A leaky faucet drips $6$ milliliters every $15$ seconds. How many liters does it waste in one day? ($1$ liter $= 1{,}000$ milliliters)*

1. Write the chain so each unit cancels:
$$\frac{6 \text{ mL}}{15 \text{ s}} \times \frac{60 \text{ s}}{1 \text{ min}} \times \frac{60 \text{ min}}{1 \text{ hr}} \times \frac{24 \text{ hr}}{1 \text{ day}} \times \frac{1 \text{ L}}{1{,}000 \text{ mL}}$$
2. Work left to right: $\frac{6}{15} = 0.4$ mL per second, so $24$ mL per minute, $1{,}440$ mL per hour, and $34{,}560$ mL per day.
3. Convert: $34{,}560 \div 1{,}000 = 34.56$ liters.

Check: a day has $86{,}400$ seconds, and $0.4 \times 86{,}400 = 34{,}560$ mL. Correct.

## Common traps

- **Flipping one side of a proportion.** If flour is on top on the left, flour goes on top on the right.
- **Converting the wrong direction.** Going from kilograms to grams should make the number *bigger*. If it gets smaller, you divided instead of multiplied.
- **Adding times instead of rates.** If one machine takes $2$ hours and another $3$ hours for a job, together they do *not* take $5$ hours. Their rates are $\frac{1}{2}$ and $\frac{1}{3}$ job per hour, which add to $\frac{5}{6}$, so the job takes $1.2$ hours.
- **Ratio parts vs. totals.** In a $7 : 3$ ratio with $50$ items, the parts are $35$ and $15$ (each part is $\frac{50}{10} = 5$), not $7$ and $3$.
- **Ignoring "per coat" or "round trip."** Two coats of paint means double the area.

## The fast way (and when to use Desmos)

This skill is mostly arithmetic, so the fastest tool is a clean setup:

- **Chain conversions in one line:** type the whole product into Desmos, such as $\frac{6}{15} \cdot 60 \cdot 60 \cdot 24 \div 1000$, and read $34.56$. No rounding along the way.
- **Ratio change problems:** for "red to blue is $7 : 4$, and after adding $6$ blue it becomes $7 : 5$," let red $= 7k$ and blue $= 4k$, then solve $\frac{7k}{4k + 6} = \frac{7}{5}$. In Desmos, graph $y = \frac{7x}{4x + 6}$ and $y = \frac{7}{5}$ and click the intersection ($x = k = 6$, so there are $42$ red).

Use mental math for simple unit rates and scales — they are one multiplication. Write units on every number; if the units in your answer do not match the question, the setup is wrong.
