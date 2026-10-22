---
skill: m-psda-onevar
minutes: 11
tags: [mean, median, spread, outliers, missing-values]
---
## What this skill is

One-variable data is summarised by its centre and its spread. At mastery level you predict how a change to the data affects each measure, and you find a missing value from a known summary.

> **Predict before you compute.** Decide whether the mean, median or spread should move, and in which direction.

## Learn the idea

**Try this first.** You add a new value equal to the current mean. Does the mean change?

**Let's reason it through.**

1. The mean is the total divided by the count. Adding a value $m$ to $n$ values with mean $m$ gives a new total of $nm + m$.
2. The new mean is $\dfrac{nm + m}{n + 1} = \dfrac{m(n + 1)}{n + 1} = m$.
3. So the mean does not change. Why? The new value sits exactly at the centre of the balance.
4. The median and the spread can still change, so check each one separately.

**Your turn.** The mean of five numbers is $12$. Four of them are $10, 11, 13$ and $14$. What is the fifth?

**Answer:** The total is $5 \cdot 12 = 60$. The four known values add to $48$, so the fifth is $60 - 48 = 12$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Total from mean | $\text{total} = \text{mean} \times \text{count}$ |
| Adding the mean | Adding a value equal to the mean leaves the mean unchanged. |
| Outliers | A large outlier raises the mean but barely moves the median. |

**Desmos check, step by step:**

1. Type $L = [10, 12, 14, 40]$.
2. Type $\operatorname{mean}(L)$ and $\operatorname{median}(L)$. The mean is $19$ and the median is $13$.
3. Remove $40$: type $L = [10, 12, 14]$. The mean drops to $12$ and the median to $12$.

```desmos-open
L=[10,12,14,40]
mean(L)
median(L)
```

## Worked example 1 (easy)

*The mean of $4$ values is $15$. Three of them are $10, 18, 12$. What is the fourth?*

1. Total: $4 \cdot 15 = 60$.
2. Fourth value: $60 - (10 + 18 + 12) = 60 - 40 = 20$.

## Worked example 2 (SAT-level)

*A list is $10, 12, 14, 40$. The $40$ is removed. How do the mean and median change?*

1. Before: mean $\dfrac{76}{4} = 19$, median $\dfrac{12 + 14}{2} = 13$.
2. After removing $40$: mean $\dfrac{36}{3} = 12$, median $12$.
3. The mean fell by $7$, and the median fell by $1$. The outlier moved the mean much more.

## Common traps

- **Assuming the median changes with every value.** It depends on the middle positions.
- **Dividing by the wrong count** after adding or removing a value.
- **Calling the mean the typical value** when there is a strong outlier.

## The fast way (and when to use Desmos)

Predict first, then check with a list. Store the data as a list and recompute after each change. Use totals to find missing values.
