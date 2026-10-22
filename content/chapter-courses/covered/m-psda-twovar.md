---
skill: m-psda-twovar
minutes: 10
---
## What school covered

Almost nothing here, and that is the point. CBSE Statistics is about one variable at a time; scatterplots, fitted lines and data models are not in the syllabus. Your functions work gives you the algebra you need, so this lesson teaches the statistics itself from the ground up.

## What two-variable data is

Instead of summarizing one list, you look at how two measured quantities travel together: hours studied and quiz score, age and resale value. Each observation is a point $(x, y)$, and the whole set is a scatterplot.

- **Read a scatterplot's direction and strength.** Up-and-to-the-right is a positive association; down-and-to-the-right is negative. Tight around an imaginary line is a strong association; a wide cloud is weak. Strength is about the scatter, not about the slope: a steep line through a wide cloud is still weak.
- **A line of best fit summarizes the trend.** The SAT usually gives you the fitted line, like $y = 0.8x + 12$ for score against hours studied. Its slope says the score rises by $0.8$ per extra hour, and it reads with units, exactly like the linear functions you know. Its intercept says the predicted value at $x = 0$.
- **Predict with the line.** To estimate the score after 10 hours, substitute $x = 10$: $y = 8 + 12 = 20$. Predictions within the range of the observed data are what the fit supports. Predicting far outside that range is extrapolation, and a question's correct answer is often that the model does not support it.
- **Residuals.** The residual is the actual value minus the predicted value: how far the point sits above or below the line. A point at $x = 10$ with actual value 23 against prediction 20 has residual $+3$. If residuals curve or fan out, a line is the wrong model.
- **Linear, exponential or quadratic?** Check equal steps in the data: constant differences point to a line, constant ratios point to exponential $y = a(b)^x$, and a constant second difference points to a quadratic. The SAT gives a table or scatterplot and asks which model fits; differences first, then ratios, then second differences.
- **Compare linear and exponential growth.** "Starts at 100 and adds 20 each year" is linear, $100 + 20t$. "Starts at 100 and grows by $20$ percent each year" is exponential, $100(1.2)^t$. After enough years the exponential always wins, and a question often asks which model the description supports.

## Worked example

A fitted line for a car's resale value is $y = 9{,}000 - 700x$, where $x$ is years since purchase. What does each number mean, and what value does the model give after 7 years?

The $9{,}000$ is the value at year zero, the new-car value. The $-700$ says the value drops by \$700 per year. At $x = 7$: $y = 9{,}000 - 4{,}900 = 4{,}100$ dollars.

Another: a table shows a savings balance after each year: 100, 120, 144, 172.8. Which model fits?

Equal time steps, and each value is the previous one times $1.2$: a constant ratio, so exponential, $y = 100(1.2)^x$. The growth rate is $20$ percent per year. A linear reader sees the differences, 20, 24, 28.8, growing, and that growth in the differences is the tell that a line is wrong.

A comparison: a colony starts at 500 and "increases by 150 each week", while a second starts at 500 and "increases by 30 percent each week". Which is larger after 4 weeks, and by roughly how much?

The first is linear: $500 + 150(4) = 1100$. The second is exponential: $500(1.3)^4 \approx 1428$. The exponential wins by about 328, even though "150" looks bigger than "30 percent" at first glance.

## Common traps

- Calling a steep line a strong association. Strength is the scatter around the line, and slope and strength answer different questions.
- Predicting outside the data's range without a second thought. The fit only speaks for the range it was built on.
- Reading the slope without its units. It is 700 dollars per year, not 700.
- Choosing a linear model for data whose differences keep growing, or an exponential model for data with constant differences.
- Computing a residual as predicted minus actual and getting the sign backwards. Actual minus predicted.

## Shortcuts and calculator checks

Enter the table in Desmos and try both fits: `y_1 ~ mx_1 + b` and `y_1 ~ a \cdot b^{x_1}`; the model with residuals scattered tightly around zero wins. For quadratic data, `y_1 ~ a x_1^2 + b x_1 + c` fits and reports the curve. On the SAT the model choice usually can be made by eye from the table: check the differences, then the ratios, then the second differences, and stop as soon as one is constant.
