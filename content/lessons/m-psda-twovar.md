---
skill: m-psda-twovar
minutes: 11
tags: [scatterplots, line-of-best-fit, slope-interpretation, model-types]
---
## What this skill is

Two-variable data pairs each $x$-value with a $y$-value, usually shown in a **scatterplot** or a table. The SAT asks you to describe the association, use a **line of best fit** to make predictions, **interpret the slope** and intercept in context, compute **residuals**, and decide whether a **linear or exponential model** fits the data better.

## Key ideas

- **Direction:** points rising left to right show a positive association; falling shows a negative association.
- **Strength:** points close to a line show a strong association; a loose cloud shows a weak one.
- A line of best fit gives **predicted** values, not exact ones. Plug the $x$-value into the equation to predict $y$.
- The slope is the **predicted change in $y$ for each increase of $1$ in $x$**. The $y$-intercept is the predicted $y$ when $x = 0$, which may not make sense in context.
- A **residual** is $\text{actual} - \text{predicted}$. A positive residual means the point lies above the line.
- **Linear** data changes by a constant **difference**; **exponential** data changes by a constant **ratio**.

## Formulas and rules

| Model | Pattern in a table | Equation |
|---|---|---|
| linear | add the same amount each step | $y = mx + b$ |
| exponential | multiply by the same factor each step | $y = a \cdot b^x$ |

- "Starts at $a$ and triples every $k$ years" is $y = a \cdot 3^{x/k}$.
- Line through two points: slope $m = \frac{y_2 - y_1}{x_2 - x_1}$, then solve for $b$.

Example: $x = 0, 1, 2, 3$ with $y = 5, 15, 45, 135$. The differences grow ($10, 30, 90$) but each ratio is $3$, so the model is $y = 5 \cdot 3^x$.

## Worked example 1 (easy)

A café finds that the line of best fit for daily hot-drink sales $y$ against the outdoor temperature $x$, in degrees, is $y = -2.5x + 140$. Predict sales on a $30$-degree day and interpret $-2.5$.

1. Predict: $y = -2.5(30) + 140 = -75 + 140 = 65$ drinks.
2. Interpret: for each $1$-degree increase in temperature, predicted sales **decrease** by $2.5$ drinks.

## Worked example 2 (SAT-level)

*A line of best fit passes through $(4, 18)$ and $(10, 33)$. One data point is $(16, 44.5)$. What is the residual for this point?*

1. Slope: $\frac{33 - 18}{10 - 4} = \frac{15}{6} = 2.5$.
2. Intercept: $18 = 2.5(4) + b$, so $b = 8$. The line is $y = 2.5x + 8$.
3. Predicted value at $x = 16$: $2.5(16) + 8 = 48$.
4. Residual: $44.5 - 48 = -3.5$.

Check: the line also gives $2.5(10) + 8 = 33$ at $x = 10$. The negative residual means the actual point lies $3.5$ units below the line.

## Common traps

- **Residual backward.** It is actual minus predicted. Predicted minus actual gives the opposite sign.
- **Treating a prediction as certain.** Answer choices with "exactly" or "will" are usually wrong; a model gives an estimate.
- **Interpreting slope as a total.** In $d = 3.2t + 7$, $3.2$ is the predicted growth **per day**, not the total size.
- **Calling exponential data linear.** Check differences *and* ratios. A constant ratio means exponential, even if the first few values look close to a line.
- **Confusing association with causation.** A strong scatterplot pattern does not show that $x$ causes $y$.

## The fast way (and when to use Desmos)

Desmos regressions answer "which equation fits the data?" directly:

- **Linear fit:** enter the table as lists, $x_1 = [1, 3, 5, 7]$ and $y_1 = [\ldots]$, then type $y_1 \sim m x_1 + b$. Desmos reports $m$, $b$, and $r$; match $m$ and $b$ to the closest choice.
- **Exponential fit:** type $y_1 \sim a \cdot b^{x_1}$ and read $a$ and $b$. If $b$ is close to $3$, the data triples each step.
- **Predictions and residuals:** after a regression, type the model with your $x$-value, such as $2.5(16) + 8$, and subtract from the actual value.

Algebra is faster for single predictions from a given equation, since it is one substitution. For model-type questions with a short table, dividing consecutive $y$-values takes seconds and needs no typing.
