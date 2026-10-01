---
skill: m-psda-onevar
minutes: 11
tags: [mean-median, frequency-tables, outliers, spread]
---
## What this skill is

One-variable data is a list of values of a single quantity: test scores, heights, numbers of pets. The SAT asks you to find the **center** (mean and median), to read data from **frequency tables** and dot plots, to predict how **outliers** affect each measure, and to compare **spread** (range and standard deviation) without heavy calculation.

## Key ideas

- The **mean** is the total divided by the count. Many questions are easier if you think in totals: $\text{total} = \text{mean} \times \text{count}$.
- The **median** is the middle value after sorting. With an even count, it is the average of the two middle values.
- A frequency table is a compressed list: the row "value $3$, frequency $4$" means $3, 3, 3, 3$.
- An **outlier** pulls the mean toward it a lot but barely moves the median. A data set with a high outlier usually has mean greater than median.
- **Standard deviation** measures how far values typically are from the mean. Tightly clustered data has a small standard deviation; widely spread data has a large one. Adding the same number to every value does not change the spread.

## Formulas and rules

$$\text{mean} = \frac{\text{sum of values}}{\text{number of values}} \qquad \text{mean from a table} = \frac{\sum (\text{value} \times \text{frequency})}{\sum \text{frequency}}$$

| Measure | Changes a lot with an outlier? |
|---|---|
| mean | yes |
| median | barely |
| range | yes |
| standard deviation | yes |

- Combined mean of two groups: $\frac{n_1 \bar{x}_1 + n_2 \bar{x}_2}{n_1 + n_2}$. For $12$ students averaging $70$ and $18$ averaging $80$: $\frac{840 + 1440}{30} = 76$.
- Median position in a sorted list of $n$ values: the $\frac{n + 1}{2}$th value.

## Worked example 1 (easy)

Find the mean and median of $3, 8, 5, 12, 5, 9$.

1. Mean: the sum is $3 + 8 + 5 + 12 + 5 + 9 = 42$, and $42 \div 6 = 7$.
2. Median: sort to get $3, 5, 5, 8, 9, 12$. The middle two values are $5$ and $8$, so the median is $\frac{5 + 8}{2} = 6.5$.

Check: the mean is a little above the median because $12$ stretches the upper end.

## Worked example 2 (SAT-level)

*The table shows how many books each of $20$ students read over the summer. Find the mean and the median.*

| Books read | Number of students |
|---|---|
| $0$ | $4$ |
| $1$ | $7$ |
| $2$ | $5$ |
| $3$ | $3$ |
| $4$ | $1$ |

1. Total books: $0(4) + 1(7) + 2(5) + 3(3) + 4(1) = 0 + 7 + 10 + 9 + 4 = 30$.
2. Mean: $30 \div 20 = 1.5$.
3. Median: with $20$ values, average the $10$th and $11$th. The first $4$ values are $0$; values $5$ through $11$ are $1$. Both middle values are $1$, so the median is $1$.

Check: the frequencies add to $4 + 7 + 5 + 3 + 1 = 20$. The mean exceeds the median, which fits the long tail toward $3$ and $4$ books.

## Common traps

- **Averaging the values column in a table.** The mean is not $\frac{0 + 1 + 2 + 3 + 4}{5} = 2$; each value must be weighted by its frequency.
- **Forgetting to sort** before finding the median.
- **Averaging two averages.** When groups have different sizes, the combined mean is not the midpoint of the two means; use totals.
- **Assuming the median changes when an extreme value changes.** Making the largest value larger, or the smallest value smaller, leaves the median of an odd-sized list unchanged — but it does increase the range and the standard deviation.
- **Confusing spread with center.** The lists $40, 45, 50, 55, 60$ and $48, 49, 50, 51, 52$ have the same mean and median, but the first has a much larger standard deviation.

## The fast way (and when to use Desmos)

Desmos does list statistics in one line:

- **Lists:** type $L = [3, 8, 5, 12, 5, 9]$, then $\operatorname{mean}(L)$, $\operatorname{median}(L)$, or $\operatorname{stdev}(L)$.
- **Frequency tables:** type the values and frequencies as two lists, $V = [0, 1, 2, 3, 4]$ and $F = [4, 7, 5, 3, 1]$, then $\operatorname{total}(V \cdot F) / \operatorname{total}(F)$ gives the mean, $1.5$.
- **Outlier questions:** delete the outlier from the list and watch which measure changes.

Use reasoning instead for "which must be true" questions about spread and outliers — they rarely need a calculation. For a missing value with a known mean, totals are fastest: if $6$ numbers average $15$, they sum to $90$; subtract the known ones.
