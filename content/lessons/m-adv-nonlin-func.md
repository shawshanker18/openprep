---
skill: m-adv-nonlin-func
minutes: 13
tags: [function-notation, quadratic-functions, exponential, polynomial]
---
## What this skill is

Nonlinear functions are functions whose graphs are not straight lines. On the SAT that mostly means **quadratic functions** (parabolas), **exponential functions** (repeated growth or decay by the same percent), and occasionally higher-degree **polynomials**. You will evaluate them, find vertices and zeros, interpret the numbers in a model, and choose the function that matches a description.

## Key ideas

- A quadratic can be written three ways, and each form shows something different (see the table below). Pick the form that answers the question.
- The vertex of a parabola lies exactly halfway between its two zeros.
- An exponential function multiplies by the same factor over equal intervals. Growth of $r$ percent per period means a factor of $1 + r$; decay of $r$ percent means $1 - r$ (with $r$ as a decimal).
- In $f(t) = a \cdot b^t$, $a$ is the starting value $f(0)$ and $b$ is the factor per unit of $t$.
- For a polynomial $p$, if $p(c) = 0$, then $c$ is an $x$-intercept and $(x - c)$ is a factor.

## Formulas and rules

| Quadratic form | Shows you |
|---|---|
| $f(x) = ax^2 + bx + c$ | $y$-intercept $c$; vertex at $x = -\frac{b}{2a}$ |
| $f(x) = a(x - h)^2 + k$ | vertex $(h, k)$ |
| $f(x) = a(x - p)(x - q)$ | zeros $p$ and $q$; vertex at $x = \frac{p + q}{2}$ |

- If $a > 0$ the parabola opens up (minimum at the vertex); if $a < 0$ it opens down (maximum).
- Exponential models: $A(1 + r)^t$ for percent growth, $A(1 - r)^t$ for percent decay, and $A \cdot 2^{t/d}$ for doubling every $d$ units (use $\left(\frac{1}{2}\right)^{t/d}$ for a half-life).

### Composing functions

To evaluate $f(g(a))$, first find $g(a)$, then use that result as the input to $f$. On a graph, read $g(a)$ from the graph of $g$, then read $f$ at that value.

### Transformations

$y = -f(x)$ flips the graph over the $x$-axis (every output is negated). $y = f(x) + k$ shifts the graph up $k$ units. $y = f(x - h)$ shifts it right $h$ units.

### Zeros and where the graph crosses

A factor $(x - c)$ crosses the $x$-axis at $c$. A squared factor $(x - c)^2$ touches the axis there without crossing. For $f(x) = (x + 5)^2 - 9$, the zeros come from $(x + 5)^2 = 9$, so $x = -2$ and $x = -8$.

### Exponential change per period

When a quantity drops by a fixed percent each period, multiply by the remaining fraction once per period. A drop of $80\%$ every $120$ seconds is a factor of $0.2$ each period, so after $360$ seconds (three periods) the height is multiplied by $0.2^3$.

### Reading a point in context

For $h(t) = 19.6 - 4.9t^2$, the point $(1, 14.7)$ means that $1$ second after the ball is dropped, it is $14.7$ meters high.

### The remainder theorem

When a polynomial $f(x)$ is divided by $x - c$, the remainder is $f(c)$. For $\ell(x) = x^4 + 20x^2 - 2000$ divided by $x + 6$, the remainder is $\ell(-6) = 1296 + 720 - 2000 = 16$.

### Percent change per interval

In $f(x) = a \cdot b^{x/k}$, each increase of $k$ multiplies the output by $b$. For $f(x) = 17(1.30)^{x/2}$, an increase of $x$ by $4$ multiplies the output by $(1.30)^2 = 1.69$, so $f$ increases by $69\%$.

### Completing the square for a minimum

$x^2 - 6x - 616 = (x - 3)^2 - 625$, so the minimum value is $-625$, at $x = 3$. Similarly, $x^2 - 6x + 2 = (x - 3)^2 - 7$, with minimum $-7$.

### Comparing growth patterns

A fixed amount added each year is linear growth. Multiplying by a fixed factor each year is exponential growth. Starting at $128$ and growing by $50\%$ a year gives $192$, then $288$, but adding $64$ each year gives $192$, then $256$. The two patterns separate quickly.

## Worked example 1 (easy)

For $f(x) = -x^2 + 6x - 5$, find $f(-1)$ and the vertex of the graph.

1. $f(-1) = -(-1)^2 + 6(-1) - 5 = -1 - 6 - 5 = -12$.
2. Vertex $x$-coordinate: $-\frac{b}{2a} = -\frac{6}{2(-1)} = 3$.
3. $f(3) = -9 + 18 - 5 = 4$, so the vertex is $(3, 4)$, a maximum since $a < 0$.

Check: $f(x) = -(x - 1)(x - 5)$ has zeros $1$ and $5$, and halfway between them is $x = 3$. Correct.

## Worked example 2 (SAT-level)

*A machine is bought for \$45,000 and loses 20% of its value each year. Write a function for its value $V$ after $t$ years, and find the first whole number of years after which the value is below \$20,000.*

1. Losing 20% leaves 80%, so the factor is $0.8$: $V(t) = 45{,}000(0.8)^t$.
2. Compute year by year: $V(1) = 36{,}000$, $V(2) = 28{,}800$, $V(3) = 23{,}040$, $V(4) = 18{,}432$.
3. The value first drops below \$20,000 after $4$ years.

Check: $V(3) = 23{,}040$ is still above \$20,000, so $3$ years is not enough.

## Common traps

- **Using the percent as the factor.** A 20% decrease is $(0.8)^t$, not $(0.2)^t$; a 3% increase is $(1.03)^t$, not $(0.03)^t$ or $(1.3)^t$.
- **Sign errors in vertex form.** $a(x + 3)^2 - 7$ has its vertex at $(-3, -7)$.
- **Squaring a negative input without parentheses.** For $f(-2)$ with $f(x) = 2x^2$, compute $2(-2)^2 = 8$, not $-8$.
- **Confusing the vertex with a zero.** The vertex is the turning point; zeros are where the graph crosses the $x$-axis.
- **Misreading the time unit.** "Doubles every $5$ hours" means the exponent is $\frac{t}{5}$, not $5t$.

## The fast way (and when to use Desmos)

Desmos is strong on this skill:

- **Vertex and zeros:** graph $y = f(x)$ and click the grey dots. The vertex, $x$-intercepts, and $y$-intercept are all marked.
- **Polynomial intercepts:** for a cubic, graph it and click where it crosses the $x$-axis, then match to the choices.
- **When does an exponential reach a value?** Graph $y = 45000(0.8)^x$ and $y = 20000$, then click the intersection ($x \approx 3.63$). Round as the context requires.
- **Evaluate:** define $f(x)$ once, then type $f(-1)$ to get the value.

Use algebra when the quadratic is already in vertex or factored form, because the answer is sitting right there in the expression. For "interpret the model" questions, Desmos cannot help: name what $a$ and $b$ mean in words, then match.
