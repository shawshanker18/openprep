---
skill: m-psda-twovar
minutes: 8
---
## Quick recap

School has given you scatterplots, correlation and regression lines. This route covers how the SAT asks you to use them: interpret the slope, make predictions, compute residuals, and choose between a linear and an exponential model.

## What the SAT adds

- **Interpret the slope in context.** In a fitted line $\hat{y} = 2.4x + 15$ with $x$ in hours studied and $y$ the predicted score, the slope means each extra hour is associated with a $2.4$ point higher predicted score.
- **Residual = actual $-$ predicted.** A positive residual means the point sits above the line.
- **Interpolate with care, extrapolate with caution.** Predictions inside the data range are reasonable; far outside they are guesses.
- **Linear or exponential?** If the output changes by the same **amount** each step, think linear. If it is multiplied by the same **factor** each step, think exponential.

## Worked example

Using $\hat{y} = 2.4x + 15$, a student who studied $5$ hours scored $30$. What is the residual?

The predicted score is $2.4 \times 5 + 15 = 27$. The residual is $30 - 27 = 3$.

Which model fits the table with $y$-values $2, 6, 18, 54$ at $x = 0, 1, 2, 3$?

Each value is $3$ times the previous one, so it is exponential, $y = 2 \cdot 3^x$. A linear model would need equal differences, and here the differences are $4, 12, 36$.

## Common traps

- Reversing the residual and getting the wrong sign.
- Saying the line shows that one thing causes the other. Association is not causation.
- Describing the slope without the units of both variables.

## Shortcuts and calculator checks

In Desmos, enter the data as a table and type `y_1 ~ mx_1 + b` for a line or `y_1 ~ ab^{x_1}` for an exponential. The residual plot option helps you see which model fits better.
