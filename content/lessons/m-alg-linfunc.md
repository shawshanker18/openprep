---
skill: m-alg-linfunc
minutes: 10
tags: [function-notation, slope, intercepts, modeling]
---
## What this skill is

A linear function changes by the same amount every time its input goes up by $1$. On the SAT you will evaluate functions written in **function notation**, find a **slope** from two points or a table, read **intercepts**, and interpret what the numbers in a model like $C(n) = 32 + 5n$ mean in a real situation.

> **Build the function first.** The SAT describes a situation, and the function has to come from the words before you evaluate it.
>
> 1. Name the input and the output.
> 2. Write the function from the story: a gym charging \$32 plus \$5 per session gives $C(n) = 5n + 32$.
> 3. Evaluate only what the question asks.

## Learn the idea

**Try this first.** A plant is $4$ cm tall on day $0$ and grows $3$ cm each day. How tall is it on day $5$? Work it out before you read on.

**Let's work it out.**

1. Start with what we know. Day $0$: $4$ cm. Day $1$: $4 + 3 = 7$ cm. Day $2$: $7 + 3 = 10$ cm.
2. Look for the pattern. Each day adds $3$. After $d$ days there have been $d$ additions of $3$, so the growth is $3d$. Why multiply? Because the same amount is added every day, and repeated addition is multiplication.
3. Add the starting height, $4$. The rule is $h(d) = 3d + 4$.
4. Check the rule against the table: $h(2) = 3(2) + 4 = 10$, which matches day $2$.
5. Now evaluate day $5$: $h(5) = 3(5) + 4 = 19$ cm.

**Your turn.** A car starts with $10$ gallons and uses $2$ gallons each hour. Write the rule $g(h)$ and find $g(4)$.

**Answer:** The starting value is $10$ and the rate is $-2$, so $g(h) = 10 - 2h$. Then $g(4) = 10 - 8 = 2$ gallons. The rate is negative because the fuel decreases.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Slope formula | $m = \dfrac{y_2 - y_1}{x_2 - x_1}$ |
| Linear function | $f(x) = mx + b$, with $m$ the rate and $b = f(0)$ |
| Constant change | If $f(x + 1) - f(x) = m$ for every $x$, then $f$ is linear with slope $m$ |

**Desmos check for a rate, step by step:**

1. Type $f(x) = 3x + 4$, the plant from the lesson.
2. Type $f(5)$. Desmos shows $19$. Then type $f(6) - f(5)$, which shows $3$, the constant change.

```desmos-open
f(x)=3x+4
f(5)
f(6)-f(5)
```

$$m = \frac{y_2 - y_1}{x_2 - x_1}$$

| Form | What you see |
|---|---|
| $f(x) = mx + b$ | slope $m$, $y$-intercept $(0, b)$ |
| $f(x) = m(x - x_1) + y_1$ | slope $m$, passes through $(x_1, y_1)$ |

- The $x$-intercept is where $f(x) = 0$: solve $mx + b = 0$ to get $x = -\frac{b}{m}$.
- A line through $(a, 0)$ and $(0, c)$ has slope $\frac{c - 0}{0 - a} = -\frac{c}{a}$.

### Reading the slope from standard form

Solve for $y$ before reading the slope. $7y + 14x = 4$ becomes $y = -2x + \dfrac{4}{7}$, so the slope is $-2$.

**Desmos way:** type $7y + 14x = 4$ exactly as written. Desmos draws the line, and any two points on it give the slope, $-2$.

```desmos
7y+14x=4
``` Lines in the same direction (parallel) share a slope.

### Interpreting a rate

In $T(x) = 55 - 6x$, the slope $-6$ is the change in temperature per hour, and $55$ is the value at $x = 0$. For each unit increase in $x$, the output changes by the slope.

**Desmos way:** type $T(x) = 55 - 6x$, then $T(0)$ and $T(1)$. Desmos shows $55$ and $49$, so each hour takes $6$ off.

```desmos
T(x)=55-6x
T(0)
T(1)
```

### Two points that the function passes through

If you know two points, the slope is the change in output divided by the change in input, and you can write the function from there.

### Vertical and horizontal lines

A vertical line $x = c$ has no slope. Lines perpendicular to it are horizontal, with slope $0$. The equation $x + 2.5 = 0$ is the vertical line $x = -2.5$, so a line through $(-6, 1.5)$ perpendicular to it is $y = 1.5$.

**Desmos way:** type $x + 2.5 = 0$ and $y = 1.5$. The vertical line and the horizontal line meet at right angles, as the rule says.

```desmos
x+2.5=0
y=1.5
```

### Rates over several units

"Increases by $9$ every $4$ seconds" is a rate of $\dfrac{9}{4}$ per second. If the speed starts at $6$ feet per second, then $v(t) = 6 + \dfrac{9}{4}t$.

**Desmos way:** type $v(t) = 6 + \dfrac{9}{4}t$, then $v(4)$. Desmos shows $15$, the speed after $4$ seconds.

```desmos
v(t)=6+\frac{9}{4}t
v(4)
```

### Parallel lines through a point

For $2x - 3y = 9$, the slope is $\dfrac{2}{3}$. The line through $(-6, 1)$ with that slope is $y - 1 = \dfrac{2}{3}(x + 6)$.

**Desmos way:** graph $2x - 3y = 9$ and the new line. They run parallel, and the new line passes through $(-6, 1)$.

```desmos
2x-3y=9
y-1=\frac{2}{3}(x+6)
```

## Worked example 1 (easy)

The function $f$ is defined by $f(x) = 7 - 2x$. Find $f(-3)$, and find the value of $x$ for which $f(x) = -5$.

1. $f(-3) = 7 - 2(-3) = 7 + 6 = 13$.
2. Set $7 - 2x = -5$. Subtract $7$: $-2x = -12$. Divide: $x = 6$.

Check: $f(6) = 7 - 12 = -5$. Correct.

**Desmos method:** type $f(x) = 7 - 2x$, then $f(-3)$, which shows $13$. For the second part, graph $y = 7 - 2x$ and $y = -5$ and click where they cross, at $x = 6$.

```desmos
f(x)=7-2x
f(-3)
y=-5
```

## Worked example 2 (SAT-level)

*A climbing gym's monthly cost $C$, in dollars, is a linear function of the number of sessions $n$. A member who climbs $3$ times pays \$47, and a member who climbs $8$ times pays \$72. What does the gym charge for $12$ sessions, and what do the slope and intercept mean?*

1. Slope: $\frac{72 - 47}{8 - 3} = \frac{25}{5} = 5$. Each session adds \$5.
2. Intercept: go back $3$ sessions from $(3, 47)$: $C(0) = 47 - 3(5) = 32$. This is a \$32 monthly base fee.
3. So $C(n) = 5n + 32$, and $C(12) = 60 + 32 = 92$. The cost is \$92.

Check: $C(8) = 40 + 32 = 72$. Correct.

**Desmos method:** plot the two points $(3, 47)$ and $(8, 72)$ and define $C(n) = 5n + 32$. The line passes through both points. Then $C(12)$ shows $92$.

```desmos
C(n)=5n+32
(3,47)
(8,72)
C(12)
```

## Common traps

- **Flipping the slope fraction.** Slope is rise over run, $\frac{\Delta y}{\Delta x}$, not $\frac{\Delta x}{\Delta y}$.
- **Mismatched subtraction order.** If you compute $y_2 - y_1$ on top, use $x_2 - x_1$ on the bottom, in the same order.
- **Confusing $f(4)$ with $f(x) = 4$.** One is an input, the other is an output.
- **Misreading a negative rate.** In $D(t) = 900 - 25t$, the $25$ means the amount *decreases* by $25$ each minute. Answer choices often describe it as an increase, or as the starting amount.
- **Using the intercept as the rate.** The constant term is a one-time amount, not a per-unit amount.

## The fast way (and when to use Desmos)

Desmos helps when there are two functions or messy numbers:

- **Evaluate:** type $f(x) = 7 - 2x$ on one line, then $f(-3)$ on the next, and Desmos prints the value.
- **Solve $f(x) = g(x)$:** define both functions and click the intersection of their graphs.
- **Line from two points:** type $x_1 = [3, 8]$ and $y_1 = [47, 72]$, then $y_1 \sim m x_1 + b$. Desmos reports $m = 5$ and $b = 32$.

Use algebra instead when the slope comes from two clean points, because the slope formula and one substitution are faster than typing lists. For interpretation questions, Desmos cannot help: translate each number into words ("per session," "starting fee") and match.
