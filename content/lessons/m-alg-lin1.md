---
skill: m-alg-lin1
minutes: 12
tags: [solving-equations, reasoning, parameters, modelling, solution-count]
---
## What this skill is

A linear equation in one variable says that two linear expressions are equal. Solving it asks which value of $x$ makes that statement true. At mastery level the question is also what the equation tells you about the situation: how many solutions it has, which constant makes it hold, and what each term means in a model.

> **Build the model first.** Before you touch the algebra, say what each term means. In a story about a \$20 fee and \$8 per hour, the $20$ is paid once and the $8h$ grows with the hours, so the equation $20 + 8h$ carries that meaning.

## Learn the idea

**Try this first.** Without solving, decide how many solutions $3(x + 2) = 3x + 7$ has, and say why.

**Let's reason it through.**

1. Expand the left side: $3x + 6 = 3x + 7$. Why expand first? The number of solutions is visible once both sides have the form $ax + b$.
2. The $x$ terms are identical, $3x$ on each side. Subtract $3x$ from both sides and $6 = 7$ is left.
3. That statement is false for every $x$, because $x$ has disappeared. So there is no solution. On a graph, $y = 3x + 6$ and $y = 3x + 7$ are parallel lines that never meet.
4. Why does the reasoning not depend on $x$? The slopes matched, so the gap between the two sides is the same number everywhere.

**Your turn.** For which value of $k$ does $2(x + 1) + k = 2x + 9$ have infinitely many solutions?

**Answer:** Expand to $2x + 2 + k = 2x + 9$. The $x$ terms already match, so the constants must match too: $2 + k = 9$, so $k = 7$.

## Key formulas and rules

| Rule | What it says |
|---|---|
| Balance rule | Do the same operation to both sides, and the equation stays true. |
| Distributive rule | $a(b + c) = ab + ac$. |
| Solution count | Simplify to $ax + b = cx + d$. If $a \ne c$, one solution. If $a = c$ and $b \ne d$, none. If $a = c$ and $b = d$, infinitely many. |
| Parameter matching | For infinitely many solutions, both the $x$ coefficients and the constants must match. For none, only the coefficients match. |
| Model meaning | In $20 + 8h$, the constant $20$ is the fixed part and $8$ is the cost per hour. |

**Desmos check for the solution count, step by step:**

1. Type $y = 2(x + 1) + 7$ and $y = 2x + 9$. Expanded, the first line is $2x + 9$, so the two lines lie on top of each other: infinitely many solutions.
2. Change the first line to $y = 2(x + 1) + 5$, which expands to $2x + 7$. Now the lines are parallel and never meet: no solution.

```desmos-open
y=2(x+1)+7
y=2x+9
y=2(x+1)+5
```

## Formulas and rules

| After simplifying $ax + b = cx + d$ | Number of solutions |
|---|---|
| $a \ne c$ | exactly one |
| $a = c$ and $b \ne d$ | none (e.g. $3 = 7$) |
| $a = c$ and $b = d$ | infinitely many (e.g. $5 = 5$) |

- Distributing a negative flips every sign inside: $-2(x - 3) = -2x + 6$.
- **Missing constant $k$:** write each side as (coefficient)$\cdot x$ + constant. For no solution, match the coefficients and not the constants. For infinitely many, match both. Each condition is a short equation in $k$.
- To clear $\frac{x}{4}$ and $\frac{x}{6}$, multiply by $12$, the least common multiple.

## Worked example 1 (easy)

*Without solving, explain why $5(x - 1) = 5x - 5$ has infinitely many solutions, and what that looks like on a graph.*

1. Distribute the $5$: $5x - 5 = 5x - 5$.
2. Both sides are now identical, so every value of $x$ makes the equation true.
3. On a graph, the two sides are the same line, so every point on it is a solution.

**Desmos method, step by step:**

1. Type $y = 5(x - 1)$ and $y = 5x - 5$.
2. Notice they overlap. One line on top of the other is the picture of infinitely many solutions.

```desmos-open
y=5(x-1)
y=5x-5
```

## Worked example 2 (SAT-level)

*A gym charges a fixed fee plus a fixed amount per session. A member who attends $5$ sessions pays \$72. A member who attends $10$ sessions pays \$112. What is the fixed fee, and what does the other number mean?*

1. Let the fee be $f$ and the cost per session be $c$. Then $f + 5c = 72$ and $f + 10c = 112$.
2. Subtract the first from the second: $5c = 40$, so $c = 8$. The $8$ is the cost of each session.
3. Substitute into the first equation: $f + 40 = 72$, so $f = 32$. The \$32 is the fee paid once, whatever the number of sessions.
4. Check with the second member: $32 + 10(8) = 112$. Correct.

**Desmos method, step by step:**

1. Type $y = f + 8x$ with $f = 32$, which gives the total for $x$ sessions.
2. Type the points $(5, 72)$ and $(10, 112)$. Both lie on the line, so the fee and cost per session are right.

```desmos-open
y=32+8x
(5,72)
(10,112)
```

## Common traps

- **Treating "no solution" as "zero."** An equation with no solution has a false statement, such as $6 = 7$, not an answer of $0$.
- **Matching only the $x$ coefficients for infinitely many solutions.** The constants must match too.
- **Reading the constant as the rate.** In $20 + 8h$, the $20$ is paid once, and the $8$ is paid for each hour.
- **Solving when the question asks for a count.** If it asks how many solutions, reason about the coefficients first.

## The fast way (and when to use Desmos)

Desmos shows the answer as a picture before you do the algebra. Graph the two sides: crossing means one solution, parallel means none, and one line on top of the other means infinitely many. For a missing constant, add a slider and drag it until the picture changes its shape.

For answer choices, substitute each into the original equation, and keep the choice that makes both sides equal.
