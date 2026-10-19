---
skill: m-alg-systems
minutes: 13
tags: [systems, modelling, solution-count, choosing-a-method]
---
## What this skill is

A system is two conditions that must hold together. At mastery level you build the system from a situation, choose a method that suits its form, and read what the answer means.

> **Build the system first.** Name two unknowns and write one equation for each fact in the story.

## Learn the idea

**Try this first.** Three coffees and two teas cost \$11. One coffee and four teas cost \$12. What does each cost?

**Let's reason it through.**

1. Name the unknowns: $c$ for a coffee and $t$ for a tea. The facts give $3c + 2t = 11$ and $c + 4t = 12$.
2. Choose a method. The second equation has $c$ with coefficient $1$, so substitution is easy. Why? Solving for $c$ avoids fractions.
3. From the second equation, $c = 12 - 4t$. Substitute: $3(12 - 4t) + 2t = 11$, so $36 - 10t = 11$ and $t = 2.5$.
4. Then $c = 12 - 4(2.5) = 2$.
5. Check both facts: $3(2) + 2(2.5) = 11$ and $2 + 4(2.5) = 12$. Both hold.

**Your turn.** Solve $2x + 3y = 4$ and $4x + 6y = c$. For what value of $c$ is there no solution?

**Answer:** The left side of the second equation is twice the first. For no solution the right side must not be $2 \cdot 4 = 8$, so $c \ne 8$. Any other $c$ gives a parallel pair that never meets.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Solution count | Compare $\dfrac{a_1}{a_2}$, $\dfrac{b_1}{b_2}$ and $\dfrac{c_1}{c_2}$. Unequal first two: one solution. Equal first two, different third: none. All equal: infinitely many. |
| Substitution | Solve one equation for a variable, then substitute into the other. |
| Elimination | Add or subtract to cancel a variable. |

**Desmos check, step by step:**

1. Type $3x + 2y = 11$ and $x + 4y = 12$ as two lines.
2. Click where they cross. The point is $(2, 2.5)$: $x$ is the coffee price and $y$ is the tea price.

```desmos-open
3x+2y=11
x+4y=12
```

## Worked example 1 (easy)

*For what value of $k$ does $2x + ky = 4$ have the same line as $4x + 6y = 8$?*

1. Make the coefficients match: $2 \cdot (2x + ky) = 4x + 2ky$ must equal $4x + 6y$, so $2k = 6$ and $k = 3$.
2. Check the constants: $2 \cdot 4 = 8$, which matches. So with $k = 3$ the two equations are the same line, with infinitely many solutions.

## Worked example 2 (SAT-level)

*A club sells adult and child tickets. Two adults and three children pay \$40. Four adults and one child pay \$50. What does one adult ticket cost, and what does the answer mean for the club's income?*

1. Let $a$ be the adult price and $c$ the child price: $2a + 3c = 40$ and $4a + c = 50$.
2. From the second, $c = 50 - 4a$. Substitute: $2a + 3(50 - 4a) = 40$, so $150 - 10a = 40$ and $a = 11$.
3. Then $c = 50 - 44 = 6$. The adult ticket is \$11 and the child ticket is \$6.
4. Check: $2(11) + 3(6) = 40$ and $4(11) + 6 = 50$. Both hold.

## Common traps

- **Substituting into the same equation you solved.** Use the other equation, or you get no new information.
- **Making a sign error when subtracting.** Subtract every term, including constants.
- **Stopping at one variable.** Read the question: it may ask for a total or a difference.

## The fast way (and when to use Desmos)

Graph both equations. The crossing is the solution, and parallel lines show a system with no solution. Use elimination when the coefficients line up, and substitution when one variable is already isolated.
