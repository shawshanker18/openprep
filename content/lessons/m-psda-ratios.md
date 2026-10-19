---
skill: m-psda-ratios
minutes: 10
tags: [proportions, rates, unit-conversion, scale]
---
## What this skill is

Ratios compare quantities, rates compare quantities with different units (miles per hour, dollars per pound), and proportions say two ratios are equal. The SAT tests setting up proportions, working with rates, converting units (often through several steps), reading map or model scales, and combining rates when two things work together.

> **Build the conversion chain first.** The SAT gives rates in one set of units and asks for another, so write the chain before multiplying.
>
> 1. Name the starting units and the target units.
> 2. Write the chain: 6 mL every 15 seconds becomes $\frac{6}{15} \cdot 60 \cdot 60 \cdot 24 \div 1000$ liters a day.
> 3. Multiply only after every unit cancels.

## Learn the idea

**Try this first.** Three pens cost \$6. How much do seven pens cost? Try to reason it out before reading on.

**Let's work it out.**

1. Ask what one pen costs. The \$6 is shared across $3$ pens, so divide: $6 \div 3 = 2$, which is \$2 each. Why divide? A unit rate answers "how much for one," and dividing spreads the total evenly.
2. Now scale to seven pens. Each pen is \$2, so seven pens cost $7 \cdot 2$ dollars.
3. Compute: $7 \cdot 2 = 14$, so the cost is \$14.
4. Check the proportion: $\dfrac{3}{6} = \dfrac{7}{14}$. Both reduce to $\dfrac{1}{2}$, so the two ratios match.

**Your turn.** Five kilograms of rice cost \$12.50. What do eight kilograms cost?

**Answer:** The unit rate is $12.50 \div 5 = 2.50$ per kg. Then $8 \cdot 2.50 = 20$, so eight kilograms cost \$20.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Unit rate | Divide the total by the count, or the amount by the units. |
| Proportion | $\dfrac{a}{b} = \dfrac{c}{d}$ when both ratios compare the same things in the same order. |
| Distance | $d = rt$ |
| Working together | Rates add: $r_1 + r_2$. Times do not add. |

**Desmos check for a proportion, step by step:**

1. Type $y = 2x$. Each pen costs $2$, so the line is the total cost for $x$ pens.
2. Type the point $(7, 14)$. It sits on the line, so seven pens cost $14$.

```desmos-open
y=2x
(7,14)
```

$$\text{distance} = \text{rate} \times \text{time} \qquad \text{amount} = \text{rate} \times \text{time}$$

| Situation | Method |
|---|---|
| "$4$ cups for every $3$ cups" | $\frac{4}{3} = \frac{x}{9}$, cross-multiply |
| Scale: $1$ cm $= 1.5$ km | multiply map distance by $1.5$ |
| Density | $\text{density} = \frac{\text{mass}}{\text{volume}}$ |
| Working together | combined rate $= r_1 + r_2$, time $= \frac{\text{job}}{r_1 + r_2}$ |

- Area scales by the square of a length scale; $1$ m$^2 = 10{,}000$ cm$^2$, not $100$ cm$^2$.

### Unit price

To compare prices, divide each cost by its amount. A $64$-ounce jug for $7.68$ dollars costs $0.12$ per ounce, and a $96$-ounce jug for $9.60$ dollars costs $0.10$ per ounce. Buying the larger jug saves $0.02$ per ounce, or $2.00$ dollars per $100$ ounces.

**Desmos way:** type $\dfrac{7.68}{64}$ and $\dfrac{9.60}{96}$. Desmos shows $0.12$ and $0.10$, the per-ounce prices.

### Direct and inverse proportion

In $y = \dfrac{x}{k}$ (direct), multiplying $x$ by $4$ multiplies $y$ by $4$. In $y = \dfrac{k}{x}$ (inverse), multiplying $x$ by $4$ divides $y$ by $4$. Read which kind of relationship the equation shows before you answer.

**Desmos way:** graph $y = 2x$ (direct) and $y = \dfrac{2}{x}$ (inverse). The first rises as $x$ grows, and the second falls. That shape tells you the relationship.

```desmos
y=2x
y=\frac{2}{x}
```

### Rates across units of time

Convert before you multiply. A rate in months becomes a rate in years by multiplying by $12$. For $54$ centimeters every $m$ months, the growth every $k$ years is $\dfrac{54 \cdot 12k}{m}$ centimeters.

**Desmos way:** type $\dfrac{54 \cdot 12k}{m}$ with $k = 1$ and $m = 6$. Desmos shows $108$, the growth per year for that rate.

## Worked example 1 (easy)

Five notebooks cost \$8.75. At the same price per notebook, how much do $12$ notebooks cost?

1. Unit rate: $8.75 \div 5 = 1.75$, so each notebook costs \$1.75.
2. Multiply: $12 \times 1.75 = 21$. The cost is \$21.

Check with a proportion: $\frac{8.75}{5} = \frac{x}{12}$ gives $5x = 105$, so $x = 21$. Correct.

**Desmos method:** type $\dfrac{8.75}{5}$, which shows $1.75$, then $12 \cdot 1.75$, which shows $21$.

## Worked example 2 (SAT-level)

*A leaky faucet drips $6$ milliliters every $15$ seconds. How many liters does it waste in one day? ($1$ liter $= 1{,}000$ milliliters)*

1. Write the chain so each unit cancels:
$$\frac{6 \text{ mL}}{15 \text{ s}} \times \frac{60 \text{ s}}{1 \text{ min}} \times \frac{60 \text{ min}}{1 \text{ hr}} \times \frac{24 \text{ hr}}{1 \text{ day}} \times \frac{1 \text{ L}}{1{,}000 \text{ mL}}$$
2. Work left to right: $\frac{6}{15} = 0.4$ mL per second, so $24$ mL per minute, $1{,}440$ mL per hour, and $34{,}560$ mL per day.
3. Convert: $34{,}560 \div 1{,}000 = 34.56$ liters.

Check: a day has $86{,}400$ seconds, and $0.4 \times 86{,}400 = 34{,}560$ mL. Correct.

**Desmos method:** type the whole chain on one line. It shows $34.56$ liters, with no rounding along the way.

```desmos
\frac{6}{15} \cdot 60 \cdot 60 \cdot 24 \div 1000
```

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

Use mental math for simple unit rates and scales, since they are just one multiplication. Write units on every number; if the units in your answer do not match the question, the setup is wrong.
