---
skill: m-alg-linfunc
minutes: 7
---
## Quick recap

You already know slope, intercepts and the forms of a line from school. This route skips the theory and goes straight to how the SAT uses it: a linear function is a rule $f(x) = mx + b$ where $m$ is the rate of change and $b$ is the starting value.

## What the SAT adds

- **Meaning in context.** In $C(n) = 32 + 5n$, the $5$ is the cost per item and the $32$ is the cost when $n = 0$. Say the unit: "dollars per item", "centimetres per week".
- **Function notation as a question.** $f(5) = 20$ means "input $5$ gives output $20$". It is not $f$ times $5$.
- **Equal steps give equal changes.** If the input goes up by the same amount each row of a table, a linear function's output goes up by one fixed amount too. That fixed amount per step is what you scale.
- **Two points are enough.** Slope is $\dfrac{y_2 - y_1}{x_2 - x_1}$, then use either point to find $b$.

## Worked example

A plant is $12$ cm tall and grows $1.5$ cm each week, so $h(w) = 12 + 1.5w$. In which week is it $30$ cm tall?

Set $30 = 12 + 1.5w$. Subtract $12$ to get $18 = 1.5w$, so $w = 12$.

A harder one: $f$ is linear, $f(3) = 11$ and $f(7) = 27$. Find $f(10)$.

The input moves $4$ and the output moves $16$, so the slope is $4$. From $x = 7$ to $x = 10$ is $3$ more steps of $4$, so $f(10) = 27 + 12 = 39$. Check with the rule $f(x) = 4x - 1$: $f(3) = 11$ and $f(7) = 27$ both hold.

## Common traps

- Reading the slope as the final value instead of the rate. The slope is the change per one unit of input.
- Dropping units or swapping them. If $x$ is weeks, the slope is "per week", not "per centimetre".
- Treating $f(5) = 20$ as $5f = 20$.
- Using $\dfrac{x_2 - x_1}{y_2 - y_1}$ for slope. Rise goes on top.

## Shortcuts and calculator checks

Skip finding the full equation when the question only asks for one more value: count steps and multiply by the rate. To check a line from a table, enter the table in Desmos and type `y_1 ~ mx_1 + b`. It gives the slope and intercept, and if the points really are linear the fit is exact.
