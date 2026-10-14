---
skill: m-adv-nonlin-func
minutes: 8
---
## Quick recap

School has given you function notation, domain and range, and the standard graphs. This route builds on that and covers what the SAT does with nonlinear functions: shifting graphs, reading a model's parts, and exponential growth.

## What the SAT adds

- **Shifts in notation.** $f(x - 3)$ moves the graph $3$ to the **right**. $f(x) + 2$ moves it $2$ **up**. The change inside the brackets works against your instinct.
- **Exponential models.** $P(t) = a \cdot b^t$ starts at $a$ and is multiplied by $b$ each step. A growth of $25\%$ per step means $b = 1.25$. A decay of $10\%$ means $b = 0.9$.
- **Time scales in the exponent.** "Triples every $4$ years" is $P(t) = a \cdot 3^{t/4}$.
- **Domain from context.** A time or a count cannot be negative, so a model may only make sense for $t \ge 0$.

## Worked example

The graph of $f$ has its lowest point at $(1, 4)$. Where is the lowest point of $g(x) = f(x - 3) + 2$?

Move right $3$ and up $2$: the point becomes $(4, 6)$.

A population starts at $500$ and triples every $4$ years. How large is it after $8$ years?

Use $P(t) = 500 \cdot 3^{t/4}$. At $t = 8$ the exponent is $2$, so $P = 500 \cdot 9 = 4500$.

## Common traps

- Shifting left for $f(x - 3)$. Replace $x$ with $x - 3$ and you need a bigger $x$ to get the same output, so the graph moves right.
- Using the percent as the base. A $25\%$ increase is $1.25$, not $25$ and not $0.25$.
- Forgetting that $t$ in the exponent is divided by the period when the growth happens every few years.

## Shortcuts and calculator checks

Plot the original and shifted function together in Desmos and see which way the vertex moved. For exponentials, test the model at the first point you are given: if $P(0)$ is not the starting amount, your setup is wrong.
