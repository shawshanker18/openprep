---
skill: m-psda-prob
minutes: 12
tags: [conditional-probability, two-way-tables, complement, given]
---
## What this skill is

Probability describes how likely an event is, and conditional probability restricts the group you are looking at. At mastery level you read the group correctly, and you choose between the complement and a direct count.

> **Name the group first.** Ask: what is the total I am dividing by? After "given," the total shrinks to that group.

## Learn the idea

**Try this first.** $60$ boys and $40$ girls are in a class. $30$ boys and $10$ girls play a sport. What is the chance a student plays a sport, given the student is a boy?

**Let's reason it through.**

1. The condition "given the student is a boy" changes the group: we only look at the $60$ boys.
2. Of those $60$, $30$ play a sport, so the chance is $\dfrac{30}{60} = \dfrac{1}{2}$.
3. Compare with the whole class: $\dfrac{30 + 10}{100} = \dfrac{40}{100}$. The condition changed the answer, so the group matters.
4. Why does the denominator change? Because "given" tells us to ignore everyone who is not a boy.

**Your turn.** Using the same table, what is the chance a student is a boy, given that the student plays a sport?

**Answer:** The group is the $40$ students who play a sport. Of them $30$ are boys, so $\dfrac{30}{40} = \dfrac{3}{4}$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Conditional probability | $P(A \mid B) = \dfrac{\text{number in both}}{\text{number in } B}$ |
| Complement | $P(\text{not } A) = 1 - P(A)$ |
| At least one | Usually $1 - P(\text{none})$ |

**Desmos check, step by step:**

1. Type $\dfrac{30}{60}$ for the boy case, which shows $0.5$.
2. Type $\dfrac{30}{40}$ for the sport case, which shows $0.75$. The same cell gives two answers because the group changed.

```desmos-open
\frac{30}{60}
\frac{30}{40}
```

## Worked example 1 (easy)

*Two fair dice are rolled. What is the chance of at least one six?*

1. The chance of no six on one die is $\dfrac{5}{6}$, so on two dice it is $\left(\dfrac{5}{6}\right)^2 = \dfrac{25}{36}$.
2. At least one six: $1 - \dfrac{25}{36} = \dfrac{11}{36}$.

## Worked example 2 (SAT-level)

*Using the class table, what is the chance a girl plays a sport?*

1. The group is the $40$ girls. Of them $10$ play a sport.
2. Probability: $\dfrac{10}{40} = \dfrac{1}{4}$.

## Common traps

- **Using the whole table after "given."** Shrink the group first.
- **Swapping the condition.** $P(A \mid B)$ and $P(B \mid A)$ have different denominators.
- **Counting "at least one" case by case.** Use the complement.

## The fast way (and when to use Desmos)

Write the group before you write the numerator. For many cases, the complement is faster. Desmos checks the division once the counts are right.
