---
skill: m-psda-percent
minutes: 10
tags: [percent-of, percent-change, reverse-percent, successive-percent]
---
## What this skill is

Percent means "per hundred." The SAT tests four kinds of percent questions: finding a **percent of** a number, computing a **percent change**, working **backward** from a changed value to the original, and applying **successive** changes one after another (a markup followed by a discount, two years of growth, and so on).

## Key ideas

- Convert a percent to a decimal by dividing by $100$: 35% is $0.35$.
- Increasing by 20% is multiplying by $1.20$. Decreasing by 20% is multiplying by $0.80$. Think in **multipliers**, not in "add the percent."
- Successive changes multiply: a 20% increase then a 25% decrease is $1.20 \times 0.75 = 0.90$, a 10% net decrease, not a 5% decrease.
- Percent change always uses the **original** value as the base.
- To undo a change, **divide** by the multiplier. If a price after a 15% discount is \$68, the original is $68 \div 0.85 = 80$, so \$80.
- In mixture questions, the amount of the ingredient (salt, juice) stays fixed when only water is added.

## Formulas and rules

$$\text{part} = \frac{p}{100} \times \text{whole} \qquad \text{percent change} = \frac{\text{new} - \text{old}}{\text{old}} \times 100$$

| Phrase | Multiplier |
|---|---|
| increase by $p$ percent | $1 + \frac{p}{100}$ |
| decrease by $p$ percent | $1 - \frac{p}{100}$ |
| $a$ is $p$ percent greater than $b$ | $a = \left(1 + \frac{p}{100}\right)b$ |

### Percent of a part

Find the part first, then the percent of it. If $35\%$ of day students and $20\%$ of evening students ride the bus, and day students are $58\%$ of the population, then the overall share is $0.58(0.35) + 0.42(0.20) = 0.287$, so $28.7\%$ of all students ride the bus. Do not average the two rates.

### Percents above 100%

A percent over $100\%$ means more than the whole. $1{,}350\%$ of a number is $13.5$ times that number.

## Worked example 1 (easy)

What percent of $72$ is $18$? Then: a \$80 item increases in price by 15%. What is the new price?

1. $\frac{18}{72} = 0.25$, so $18$ is 25% of $72$.
2. New price: $80 \times 1.15 = 92$, so \$92.

Check: 15% of $80$ is $12$, and $80 + 12 = 92$. Correct.

## Worked example 2 (SAT-level)

*A store marks up the wholesale cost of a jacket by 60%. Later, it sells the jacket at 25% off the marked price, for \$54. What was the wholesale cost?*

1. Combine the multipliers: $1.60 \times 0.75 = 1.20$. The sale price is 120% of the cost.
2. Work backward: cost $= 54 \div 1.20 = 45$. The wholesale cost was \$45.

Check forward: $45 \times 1.6 = 72$ (marked price), and $72 \times 0.75 = 54$. Correct.

## Common traps

- **Adding or subtracting percents.** A 60% markup then a 25% discount is not a 35% increase; using $1.35$ gives \$40, which is wrong.
- **Taking the percent of the new value when undoing a change.** If \$68 is after a 15% discount, adding 15% of \$68 gives \$78.20, not the correct \$80.
- **Using the wrong base for percent change.** From \$80 to \$100 is a $\frac{20}{80} = 0.25$, or 25%, increase. Dividing by $100$ gives 20%, a trap answer.
- **Answering the complement.** If $18$ of $48$ students are in a club, 37.5% are in it and 62.5% are *not*. Read carefully to see which one the question wants.
- **Percent vs. percentage points.** Going from 40% to 50% is a 10-percentage-point increase but a 25% relative increase.

## The fast way (and when to use Desmos)

Multipliers are the fast way: one line of arithmetic handles any chain of changes, forward or backward. For a chain such as "up 30%, then down 10%, ending at $234$," compute $234 \div (1.3 \times 0.9) = 234 \div 1.17 = 200$.

Desmos helps mainly as a calculator, and for setups where the unknown is buried:

- **Type the whole chain** in one line so nothing gets rounded early.
- **Unknown original value:** graph $y = 1.6 \cdot 0.75x$ and $y = 54$ and click the intersection ($x = 45$).
- **Mixtures:** for "how much water turns $500$ grams of a 20% salt solution into a 16% solution," the salt stays at $100$ grams, so graph $y = \frac{100}{500 + x}$ and $y = 0.16$ and click the intersection ($x = 125$).

Algebra is faster for single-step questions; percent-of and percent change are one division each.
