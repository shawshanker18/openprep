---
skill: m-psda-onevar
minutes: 11
tags: [mean-median, frequency-tables, outliers, spread]
---
## What this skill is

One-variable data is a list of values of a single quantity: test scores, heights, numbers of pets. The SAT asks you to find the **center** (mean and median), to read data from **frequency tables** and dot plots, to predict how **outliers** affect each measure, and to compare **spread** (range and standard deviation) without heavy calculation.

> **Build the total first.** The SAT gives you a mean and asks about a missing value, so write the total from the mean before finding anything.
>
> 1. Name the count and the mean.
> 2. Write the total: 6 scores with mean 15 gives $6 \times 15 = 90$.
> 3. Subtract the known values only after the total is written.

## Learn the idea

**Try this first.** The list is $2, 4, 4, 10$. Do you think the mean or the median is bigger? Why?

**Let's work it out.**

1. The mean is the total divided by the count. Why? It is the value every item would have if the total were shared out evenly. Add the values: $2 + 4 + 4 + 10 = 20$, and $20 \div 4 = 5$.
2. The median is the middle value after sorting. The list is already sorted, and the middle two values are $4$ and $4$. The median is $4$.
3. Compare: the mean $5$ is bigger than the median $4$. Why? The value $10$ is far above the others. It pulls the total up, so the mean moves toward it. The median only counts positions, so one large value barely moves it.
4. This is how to read a skewed list: when the mean is above the median, the data have a long tail on the high side.

**Your turn.** Find the mean and median of $1, 3, 5, 7, 100$. Which measure does the $100$ affect more?

**Answer:** The mean is $116 \div 5 = 23.2$, and the median is $5$. The $100$ pulls the mean far up but leaves the median at the middle value, $5$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Mean | $\bar{x} = \dfrac{\text{sum of values}}{\text{count}}$ |
| Total from mean | $\text{total} = \text{mean} \times \text{count}$ |
| Combined mean | $\dfrac{n_1 \bar{x}_1 + n_2 \bar{x}_2}{n_1 + n_2}$ |
| Median position | In a sorted list of $n$ values, the median is the $\dfrac{n + 1}{2}$th value. |

**Desmos check for the mean and median, step by step:**

1. Type $L = [2, 4, 4, 10]$ to store the list.
2. Type $\operatorname{mean}(L)$, which shows $5$, and $\operatorname{median}(L)$, which shows $4$.

```desmos-open
L=[2,4,4,10]
mean(L)
median(L)
```

$$\text{mean} = \frac{\text{sum of values}}{\text{number of values}} \qquad \text{mean from a table} = \frac{\sum (\text{value} \times \text{frequency})}{\sum \text{frequency}}$$

| Measure | Changes a lot with an outlier? |
|---|---|
| mean | yes |
| median | barely |
| range | yes |
| standard deviation | yes |

- Combined mean of two groups: $\frac{n_1 \bar{x}_1 + n_2 \bar{x}_2}{n_1 + n_2}$. For $12$ students averaging $70$ and $18$ averaging $80$: $\frac{840 + 1440}{30} = 76$.
- Median position in a sorted list of $n$ values: the $\frac{n + 1}{2}$th value.

### Changing one value

Removing an outlier that is above the mean lowers the mean. Adding a value equal to the current mean leaves the mean unchanged. The median and standard deviation respond differently, so check which measure the question asks about.

**Desmos way:** type the list with and without the outlier, then compare $\operatorname{mean}(L)$ and $\operatorname{median}(L)$ before and after. Only the mean moves much.

### Finding a missing value

Use totals. If the mean of $n$ values is $m$, the total is $nm$, and a missing value is the total minus the known values.

**Desmos way:** type the known values as a list and compare the mean with and without the missing value. Desmos shows how the mean shifts when a value is added or removed. The same method finds a missing frequency in a table.

### Reading a graph in context

A highest point is a maximum. A flat segment means no change. A dotted reference line marks a fixed level. A single point is one input paired with one output, and it has a meaning in context. Name what each axis measures before you interpret.

**Desmos way:** type each point as $(x, y)$, with the axes named in the question. Desmos plots them, and the highest point is the maximum.

### Mean versus median

A high outlier pulls the mean up but barely moves the median. If the mean is greater than the median, the data have a long tail on the high side.

**Desmos way:** type the list, then $\operatorname{mean}(L)$ and $\operatorname{median}(L)$. A high outlier makes the mean larger, while the median stays close.

## Worked example 1 (easy)

Find the mean and median of $3, 8, 5, 12, 5, 9$.

1. Mean: the sum is $3 + 8 + 5 + 12 + 5 + 9 = 42$, and $42 \div 6 = 7$.
2. Median: sort to get $3, 5, 5, 8, 9, 12$. The middle two values are $5$ and $8$, so the median is $\frac{5 + 8}{2} = 6.5$.

Check: the mean is a little above the median because $12$ stretches the upper end.

**Desmos method:** type the list, then $\operatorname{mean}(L)$ and $\operatorname{median}(L)$.

```desmos
L=[3,8,5,12,5,9]
mean(L)
median(L)
```

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

**Desmos method:** type the frequency lists $V = [0,1,2,3,4]$ and $F = [4,7,5,3,1]$, then $\operatorname{total}(V \cdot F) / \operatorname{total}(F)$, which shows $1.5$. For the median, type the expanded list and find its median.

```desmos
V=[0,1,2,3,4]
F=[4,7,5,3,1]
total(V \cdot F)/total(F)
L=[0,0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4]
median(L)
```

## Common traps

- **Averaging the values column in a table.** The mean is not $\frac{0 + 1 + 2 + 3 + 4}{5} = 2$; each value must be weighted by its frequency.
- **Forgetting to sort** before finding the median.
- **Averaging two averages.** When groups have different sizes, the combined mean is not the midpoint of the two means; use totals.
- **Assuming the median changes when an extreme value changes.** Making the largest value larger, or the smallest value smaller, leaves the median of an odd sized list unchanged. It does, however, increase the range and the standard deviation.
- **Confusing spread with center.** The lists $40, 45, 50, 55, 60$ and $48, 49, 50, 51, 52$ have the same mean and median, but the first has a much larger standard deviation.

## The fast way (and when to use Desmos)

Desmos does list statistics in one line:

- **Lists:** type $L = [3, 8, 5, 12, 5, 9]$, then $\operatorname{mean}(L)$, $\operatorname{median}(L)$, or $\operatorname{stdev}(L)$.
- **Frequency tables:** type the values and frequencies as two lists, $V = [0, 1, 2, 3, 4]$ and $F = [4, 7, 5, 3, 1]$, then $\operatorname{total}(V \cdot F) / \operatorname{total}(F)$ gives the mean, $1.5$.
- **Outlier questions:** delete the outlier from the list and watch which measure changes.

Use reasoning instead for "which must be true" questions about spread and outliers, because they rarely need a calculation. For a missing value with a known mean, totals are fastest: if $6$ numbers average $15$, they sum to $90$; subtract the known ones.
