---
skill: m-psda-twovar
minutes: 12
tags: [scatterplots, residuals, model-choice, slope-meaning]
---
## What this skill is

A scatterplot shows the relationship between two variables, and a model summarises it. At mastery level you interpret the slope in context, read a residual as a comparison with the model, and choose between linear and exponential models.

> **Name the two variables first.** Say which one explains the other before you read the model.

## Learn the idea

**Try this first.** A model predicts a score of $25$ for $5$ hours of study. A student who studied $5$ hours scored $22$. Is the student above or below the model?

**Let's reason it through.**

1. Compare actual to predicted: $22 - 25 = -3$. Why subtract predicted from actual? A residual measures how far the actual point is from the model, and the sign tells the direction.
2. The residual is negative, so the student scored below the prediction.
3. Interpret: this student did worse than the typical student with $5$ hours of study, by $3$ points.
4. Caution: one negative residual does not show the model is wrong. Check the whole pattern of residuals.

**Your turn.** The slope of a model is $3.2$, with the variable being hours studied and the output the score. What does $3.2$ mean?

**Answer:** Each extra hour of study is associated with a predicted increase of $3.2$ points in the score. It is a prediction for typical students, not a guaranteed gain for each one.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Residual | $\text{actual} - \text{predicted}$ |
| Slope meaning | The predicted change in $y$ for each increase of $1$ in $x$. |
| Model choice | Equal differences suggest linear. Equal ratios suggest exponential. |

**Desmos check, step by step:**

1. Type $y = 3x + 10$, a line through the cloud.
2. Type the point $(5, 22)$. It sits below the line, so its residual is negative.

```desmos-open
y=3x+10
(5,22)
```

## Worked example 1 (easy)

*A model is $y = 3x + 10$. Find the residual for the point $(5, 22)$.*

1. Predicted: $3(5) + 10 = 25$.
2. Residual: $22 - 25 = -3$.

## Worked example 2 (SAT-level)

*The values $2, 4, 8, 16$ are observed at $x = 1, 2, 3, 4$. Which model fits, and what does it predict at $x = 5$?*

1. The differences are $2, 4, 8$, which grow, so a linear model is poor.
2. The ratios are $2, 2, 2$, a constant factor, so the model is exponential: $y = 2^x$.
3. Predict at $x = 5$: $y = 2^5 = 32$.

## Common traps

- **Reversing the residual.** It is actual minus predicted.
- **Calling the slope a guarantee.** It describes the typical change.
- **Choosing a linear model for doubling data.**

## The fast way (and when to use Desmos)

Plot the points with the candidate model. Look at the residuals for a pattern. A curve in the residuals means the model shape is wrong.
