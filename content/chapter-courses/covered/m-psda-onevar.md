---
skill: m-psda-onevar
minutes: 7
---
## Quick recap

You have computed mean, median and standard deviation in the Statistics chapter. This route goes straight to the SAT questions: predicting what an outlier does, comparing spread without calculating, and recovering a missing value from the mean.

## What the SAT adds

- **Outliers move the mean far and the median little.** One very large value drags the mean toward it; the median only shifts by one position.
- **Comparing spread.** The set whose values sit farther from the center has the larger standard deviation. You usually do not need to compute it.
- **Frequency tables.** Weight each value by its frequency before finding the mean. The median is the middle of the full list, not the middle row.
- **Missing value.** Total = mean $\times$ count, so subtract the known values from that total.

## Worked example

Five numbers have a mean of $14$. Four of them are $10$, $12$, $15$ and $18$. What is the fifth?

The total is $14 \times 5 = 70$. The known four add to $55$, so the fifth is $15$.

The set $\{4, 5, 6, 7, 8\}$ has mean and median $6$. What happens if $100$ is added?

The total becomes $30 + 100 = 130$ over $6$ values, so the mean is about $21.7$. The median becomes the average of $6$ and $7$, which is $6.5$. The mean changed a lot and the median barely moved.

## Common traps

- Finding the median of a frequency table by looking at the middle row.
- Assuming a bigger range always means a bigger standard deviation. Check where most values sit.
- Forgetting that adding a value changes the count in the mean.

## Shortcuts and calculator checks

Desmos has `mean([...])`, `median([...])` and `stdev([...])`. Type the list in once and edit it to see how each measure responds to an outlier.
