---
skill: m-alg-linfunc
minutes: 12
tags: [rates, intercepts, modelling, comparing-models]
---
## What this skill is

A linear function describes a quantity that changes at a constant rate. At mastery level the question is what the rate and the starting value mean in a situation, and how two linear models compare.

> **Build the model first.** Name the input, the output, the starting value, and the rate before you write any rule.

## Learn the idea

**Try this first.** Plan A charges \$30 plus \$0.10 per minute. Plan B charges \$0.15 per minute with no fee. At how many minutes do the plans cost the same?

**Let's reason it through.**

1. Write each plan as a function of minutes $m$: $A(m) = 30 + 0.10m$ and $B(m) = 0.15m$.
2. The plans cost the same where $A(m) = B(m)$. Why set them equal? The cost is one number for each plan, so the same cost means the same value of the output.
3. Solve: $30 + 0.10m = 0.15m$, so $30 = 0.05m$ and $m = 600$.
4. Check the meaning. At $600$ minutes both plans cost \$60. Below that, Plan B is cheaper, because its rate is what matters when the fee is small compared with the usage.

**Your turn.** A tank holds 40 litres and drains at 2.5 litres per minute. Write the amount $L(t)$, and say what the $-2.5$ means in words.

**Answer:** $L(t) = 40 - 2.5t$. The $-2.5$ is the rate of change: the tank loses 2.5 litres every minute, so the amount falls.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Linear form | $f(x) = mx + b$: $m$ is the rate of change, $b = f(0)$ is the starting value. |
| Slope from two points | $m = \dfrac{f(x_2) - f(x_1)}{x_2 - x_1}$ |
| Equal output | Two models agree where their outputs are equal. |

**Desmos check, step by step:**

1. Type $y = 30 + 0.10x$ and $y = 0.15x$ as two lines.
2. Click where they cross. The $x$-value is $600$, the number of minutes where the plans cost the same.

```desmos-open
y=30+0.1x
y=0.15x
```

## Worked example 1 (easy)

*A function is linear with $f(3) = 8$ and $f(7) = 20$. Find its rule.*

1. Slope: $\dfrac{20 - 8}{7 - 3} = 3$.
2. Starting value: $8 = 3(3) + b$, so $b = -1$.
3. Rule: $f(x) = 3x - 1$. Check: $f(7) = 21 - 1 = 20$.

## Worked example 2 (SAT-level)

*Two linear functions are $f(x) = 2x + 5$ and $g(x) = -x + 11$. At what $x$ do they have the same output, and what is that output?*

1. Set them equal: $2x + 5 = -x + 11$, so $3x = 6$ and $x = 2$.
2. The shared output is $f(2) = 2(2) + 5 = 9$. Check: $g(2) = -2 + 11 = 9$.

## Common traps

- **Reading the starting value as a rate.** In $f(x) = 3x - 1$, the $-1$ is the value at $x = 0$, not how fast it changes.
- **Using the wrong order in the slope.** Keep the same order for the outputs and the inputs.
- **Forgetting the units.** A rate in dollars per minute needs the minutes as the input.

## The fast way (and when to use Desmos)

Graph both models. The crossing point gives the answer, and the picture shows which model is cheaper on each side of it. Use algebra when the two rules are already simple.
