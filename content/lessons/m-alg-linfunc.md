---
skill: m-alg-linfunc
minutes: 10
tags: [function-notation, slope, intercepts, modeling]
---
## What this skill is

A linear function changes by the same amount every time its input goes up by $1$. On the SAT you will evaluate functions written in **function notation**, find a **slope** from two points or a table, read **intercepts**, and interpret what the numbers in a model like $C(n) = 32 + 5n$ mean in a real situation.

## Key ideas

- $f(x) = mx + b$: $m$ is the slope (rate of change) and $b$ is $f(0)$, the $y$-intercept.
- $f(4)$ means "put $4$ in for $x$." The question "for what $x$ is $f(x) = 4$?" is different: set the expression equal to $4$ and solve.
- Slope is $\frac{\text{change in output}}{\text{change in input}}$. Any two points on the line give the same slope.
- If $f(x + 1) = f(x) + 3$, the slope is $3$. If $f(x + 5) = f(x) + 10$, the slope is $\frac{10}{5} = 2$.
- In a model, the slope is the **rate** (per minute, per mile, per item), and the intercept is the **starting value** when the input is $0$.

## Formulas and rules

$$m = \frac{y_2 - y_1}{x_2 - x_1}$$

| Form | What you see |
|---|---|
| $f(x) = mx + b$ | slope $m$, $y$-intercept $(0, b)$ |
| $f(x) = m(x - x_1) + y_1$ | slope $m$, passes through $(x_1, y_1)$ |

- The $x$-intercept is where $f(x) = 0$: solve $mx + b = 0$ to get $x = -\frac{b}{m}$.
- A line through $(a, 0)$ and $(0, c)$ has slope $\frac{c - 0}{0 - a} = -\frac{c}{a}$.

## Worked example 1 (easy)

The function $f$ is defined by $f(x) = 7 - 2x$. Find $f(-3)$, and find the value of $x$ for which $f(x) = -5$.

1. $f(-3) = 7 - 2(-3) = 7 + 6 = 13$.
2. Set $7 - 2x = -5$. Subtract $7$: $-2x = -12$. Divide: $x = 6$.

Check: $f(6) = 7 - 12 = -5$. Correct.

## Worked example 2 (SAT-level)

*A climbing gym's monthly cost $C$, in dollars, is a linear function of the number of sessions $n$. A member who climbs $3$ times pays \$47, and a member who climbs $8$ times pays \$72. What does the gym charge for $12$ sessions, and what do the slope and intercept mean?*

1. Slope: $\frac{72 - 47}{8 - 3} = \frac{25}{5} = 5$. Each session adds \$5.
2. Intercept: go back $3$ sessions from $(3, 47)$: $C(0) = 47 - 3(5) = 32$. This is a \$32 monthly base fee.
3. So $C(n) = 5n + 32$, and $C(12) = 60 + 32 = 92$. The cost is \$92.

Check: $C(8) = 40 + 32 = 72$. Correct.

## Common traps

- **Flipping the slope fraction.** Slope is rise over run, $\frac{\Delta y}{\Delta x}$, not $\frac{\Delta x}{\Delta y}$.
- **Mismatched subtraction order.** If you compute $y_2 - y_1$ on top, use $x_2 - x_1$ on the bottom, in the same order.
- **Confusing $f(4)$ with $f(x) = 4$.** One is an input, the other is an output.
- **Misreading a negative rate.** In $D(t) = 900 - 25t$, the $25$ means the amount *decreases* by $25$ each minute. Answer choices often describe it as an increase, or as the starting amount.
- **Using the intercept as the rate.** The constant term is a one-time amount, not a per-unit amount.

## The fast way (and when to use Desmos)

Desmos helps when there are two functions or messy numbers:

- **Evaluate:** type $f(x) = 7 - 2x$ on one line, then $f(-3)$ on the next, and Desmos prints the value.
- **Solve $f(x) = g(x)$:** define both functions and click the intersection of their graphs.
- **Line from two points:** type $x_1 = [3, 8]$ and $y_1 = [47, 72]$, then $y_1 \sim m x_1 + b$. Desmos reports $m = 5$ and $b = 32$.

Use algebra instead when the slope comes from two clean points, because the slope formula and one substitution are faster than typing lists. For interpretation questions, Desmos cannot help: translate each number into words ("per session," "starting fee") and match.
