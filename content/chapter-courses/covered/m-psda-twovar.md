---
skill: m-psda-twovar
minutes: 9
---
## What school covered

Almost nothing here, and that is the point. CBSE Statistics is about one variable at a time; scatterplots, fitted lines and data models are not in the syllabus. Your functions work gives you the algebra you need, so this lesson teaches the statistics itself from the ground up.

## What two-variable data is

Instead of summarizing one list, you look at how two measured quantities travel together: hours studied and quiz score, age and resale value. Each observation is a point $(x, y)$, and the whole set is a scatterplot.

- **Read a scatterplot's direction and strength.** Up-and-to-the-right is a positive association; down-and-to-the-right is negative. Tight around an imaginary line is a strong association; a wide cloud is weak. Strength is about the cloud, not about the slope.
- **A line of best fit summarizes the trend.** The SAT usually gives you the fitted line, like $y = 0.8x + 12$ for score against hours studied. Its slope says the score rises by $0.8$ per extra hour, and it reads with units, exactly like the linear functions you know.
- **Predict with the line.** To estimate the score after 10 hours, substitute $x = 10$: $y = 8 + 12 = 20$. Predictions within the range of the observed data are what the fit supports. Predicting far outside that range is extrapolation, and a question's correct answer is often that the model does not support it.
- **Residuals.** The residual is the actual value minus the predicted value: how far the point sits above or below the line. A point at $x = 10$ with actual value 23 against prediction 20 has residual $+3$. If residuals are not random, a line is the wrong model.
- **Linear or exponential?** Check equal steps in the data: if equal input steps add roughly a constant amount, fit a line. If they multiply by a constant factor, an exponential model like $y = a(b)^x$ is right. Growth questions on the SAT live on exactly this choice.

## Worked example

A fitted line for a car's resale value is $y = 9{,}000 - 700x$, where $x$ is years since purchase. What does each number mean, and what value does the model give after 7 years?

The $9{,}000$ is the value at year zero, the new-car value. The $-700$ says the value drops by \$700 per year. At $x = 7$: $y = 9{,}000 - 4{,}900 = 4{,}100$ dollars.

Another: a table shows a savings balance after each year: 100, 120, 144, 172.8. Which model fits?

Equal time steps, and each value is the previous one times $1.2$: a constant ratio, so exponential, $y = 100(1.2)^x$. The growth rate is $20$ percent per year. A linear reader sees the differences, 20, 24, 28.8, growing, and that growth in the differences is the tell that a line is wrong.

## Common traps

- Calling a steep line a strong association. Strength is the scatter around the line, and slope and strength answer different questions.
- Predicting outside the data's range without a second thought. The fit only speaks for the range it was built on.
- Reading the slope without its units. It is 700 dollars per year, not 700.
- Choosing a linear model for data whose differences keep growing, or an exponential model for data with constant differences.
- Computing a residual as predicted minus actual and getting the sign backwards. Actual minus predicted.

## Shortcuts and calculator checks

Enter the table in Desmos and try both fits: `y_1 ~ mx_1 + b` and `y_1 ~ a \cdot b^{x_1}`. The one with the residuals scattered tightly around zero wins. On the SAT the model choice usually can be made by eye from the table: check the differences, then check the ratios, and stop as soon as one is constant.
