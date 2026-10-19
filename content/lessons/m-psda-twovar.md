---
skill: m-psda-twovar
minutes: 11
tags: [scatterplots, line-of-best-fit, slope-interpretation, model-types]
---
## What this skill is

Two-variable data pairs each $x$-value with a $y$-value, usually shown in a **scatterplot** or a table. The SAT asks you to describe the association, use a **line of best fit** to make predictions, **interpret the slope** and intercept in context, compute **residuals**, and decide whether a **linear or exponential model** fits the data better.

> **Build the model first.** The SAT gives you data points and asks for a prediction or residual, so write the line or curve from the points before using it.
>
> 1. Name the two variables and the points you have.
> 2. Write the model: a line through $(4, 18)$ and $(10, 33)$ gives $y = 2.5x + 8$.
> 3. Predict or find residuals only with the model written.

## Learn the idea

**Try this first.** The line $y = 2x + 5$ predicts a value at $x = 4$. The actual value is $15$. Is the point above or below the line?

**Let's work it out.**

1. Find the predicted value: put $x = 4$ into the line. $2(4) + 5 = 13$. The line says $13$ at this $x$.
2. Compare with the actual value, $15$. The point is higher than the line, so it lies above it.
3. The residual is actual minus predicted: $15 - 13 = 2$. Why this order? A positive residual means the data beat the prediction, and the sign tells you which side of the line the point is on.
4. Check the direction: if the actual value had been $11$, the residual would be $-2$, below the line. The sign always answers "above or below?"

**Your turn.** The line is $y = 3x - 1$. At $x = 2$ the actual value is $4$. Find the residual and say whether the point is above or below the line.

**Answer:** The predicted value is $3(2) - 1 = 5$. The residual is $4 - 5 = -1$, so the point is below the line.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Line of best fit | $\hat{y} = mx + b$ predicts $y$ from $x$. |
| Slope meaning | $m$ is the predicted change in $y$ for each increase of $1$ in $x$. |
| Residual | $\text{residual} = \text{actual} - \text{predicted}$ |
| Exponential model | $y = a \cdot b^x$ when the data have a constant ratio |

**Desmos check for a residual, step by step:**

1. Type $y = 2.5x + 8$, the line of best fit from the lesson.
2. Type the point $(16, 44.5)$. It sits below the line, so its residual is negative: $44.5 - 48 = -3.5$.

```desmos-open
y=2.5x+8
(16,44.5)
```

| Model | Pattern in a table | Equation |
|---|---|---|
| linear | add the same amount each step | $y = mx + b$ |
| exponential | multiply by the same factor each step | $y = a \cdot b^x$ |

- "Starts at $a$ and triples every $k$ years" is $y = a \cdot 3^{x/k}$.
- Line through two points: slope $m = \frac{y_2 - y_1}{x_2 - x_1}$, then solve for $b$.

Example: $x = 0, 1, 2, 3$ with $y = 5, 15, 45, 135$. The differences grow ($10, 30, 90$) but each ratio is $3$, so the model is $y = 5 \cdot 3^x$.

### Comparing trends

Compare slopes to compare how fast two quantities change, and remember the slope is the predicted change per one unit of $x$. The $y$-intercept is the predicted value when $x = 0$. Check whether a table grows by equal differences (linear) or equal ratios (exponential) before choosing a model.

**Desmos way:** graph $y = 5 \cdot 3^x$ with the points $(0, 5)$, $(1, 15)$, $(2, 45)$, and $(3, 135)$. All four lie on the curve, so the model is exponential.

```desmos
y=5\cdot 3^x
(0,5)
(1,15)
(2,45)
(3,135)
```

## Worked example 1 (easy)

A café finds that the line of best fit for daily hot-drink sales $y$ against the outdoor temperature $x$, in degrees, is $y = -2.5x + 140$. Predict sales on a $30$-degree day and interpret $-2.5$.

1. Predict: $y = -2.5(30) + 140 = -75 + 140 = 65$ drinks.
2. Interpret: for each $1$-degree increase in temperature, predicted sales **decrease** by $2.5$ drinks.

**Desmos method:** graph $y = -2.5x + 140$ and the point $(30, 65)$. The point is on the line, so the prediction is $65$ drinks.

```desmos
y=-2.5x+140
(30,65)
```

## Worked example 2 (SAT-level)

*A line of best fit passes through $(4, 18)$ and $(10, 33)$. One data point is $(16, 44.5)$. What is the residual for this point?*

1. Slope: $\frac{33 - 18}{10 - 4} = \frac{15}{6} = 2.5$.
2. Intercept: $18 = 2.5(4) + b$, so $b = 8$. The line is $y = 2.5x + 8$.
3. Predicted value at $x = 16$: $2.5(16) + 8 = 48$.
4. Residual: $44.5 - 48 = -3.5$.

Check: the line also gives $2.5(10) + 8 = 33$ at $x = 10$. The negative residual means the actual point lies $3.5$ units below the line.

**Desmos method:** graph $y = 2.5x + 8$ with the three points $(4, 18)$, $(10, 33)$, and $(16, 44.5)$. The third point sits below the line, so its residual is negative.

```desmos
y=2.5x+8
(4,18)
(10,33)
(16,44.5)
```

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
