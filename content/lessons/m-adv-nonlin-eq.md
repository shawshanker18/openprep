---
skill: m-adv-nonlin-eq
minutes: 12
tags: [square-roots, factoring, discriminant, radical-equations, vertex-form, nonlinear-systems]
---
## What this skill is

Nonlinear equations are equations where the variable is squared, under a root, in a denominator, or otherwise not just multiplied by a number. On the SAT this mostly means **quadratic equations** (with an $x^2$ term), **radical equations** (with $\sqrt{\ }$), and **nonlinear systems**, where a line meets a curve. You will be asked for solutions, for the number of solutions, or for a constant that makes something true.

> **Build the equation first.** The SAT gives you a situation and asks about it, so the equation has to come from the words before any solving starts.
>
> 1. Name the unknown and what it measures.
> 2. Write the equation from the story: a ball at height $h$ after $t$ seconds gives $h = -16t^2 + 48t$.
> 3. Solve only if the question asks for a value.

## Key ideas

- A quadratic equation can have zero, one, or two real solutions. Graphically, these are the places where the parabola crosses the $x$-axis.
- If a product equals zero, at least one factor equals zero. This is why factoring works: $(x - a)(x - b) = 0$ means $x = a$ or $x = b$.
- The **discriminant** $b^2 - 4ac$ tells you how many real solutions there are without solving.
- Squaring both sides of an equation can create **extraneous solutions**: values that solve the squared equation but not the original. Always check them.
- Solving a system of a line and a parabola means setting the two expressions equal. The number of intersection points equals the number of solutions.

## Formulas and rules

For $ax^2 + bx + c = 0$:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

| Discriminant $b^2 - 4ac$ | Real solutions |
|---|---|
| positive | two |
| zero | exactly one |
| negative | zero |

- Vertex of $y = ax^2 + bx + c$: $x = -\frac{b}{2a}$; substitute back for the $y$-value.
- Sum of solutions $= -\frac{b}{a}$; product of solutions $= \frac{c}{a}$.
- Perfect squares: $(x + k)^2 = x^2 + 2kx + k^2$.

### A line and a parabola

Set the two expressions equal and solve the resulting quadratic. For $y = x^2$ and $y = 2x - 1$: $x^2 - 2x + 1 = 0$, so $(x - 1)^2 = 0$ and there is exactly one intersection point (the line just touches the parabola).

**Desmos way:** graph $y = x^2$ and $y = 2x - 1$. The line touches the parabola at one point, $x = 1$, which is the single solution.

```desmos
y=x^2
y=2x-1
```

### The discriminant as a condition

"No real solutions" means $b^2 - 4ac < 0$. For $-9x^2 + bx - 16 = 0$: $b^2 - 4(-9)(-16) < 0$ gives $b^2 < 576$, so $|b| < 24$ and the largest positive integer value is $b = 23$.

**Desmos way:** graph $y = -9x^2 + bx - 16$ with $b$ as a slider. Drag $b$ until the parabola stops crossing the $x$-axis. At $b = 23$ it misses the axis, which matches $|b| < 24$.

```desmos
y=-9x^2+bx-16
b=23
```

### Absolute value equations

For $|A| = B$, solve two cases, $A = B$ and $A = -B$. If $B < 0$ there is no solution. For $|11 - x| = 4$: $11 - x = 4$ gives $x = 7$, and $11 - x = -4$ gives $x = 15$.

**Desmos way:** graph $y = |11 - x|$ and $y = 4$, then click the two crossings at $x = 7$ and $x = 15$.

```desmos
y=|11-x|
y=4
```

### Radical and exponential equations

A square root is never negative, so $\sqrt{x} = -5$ has no solution. For $4^{x/6} + 7 = 71$: $4^{x/6} = 64 = 4^3$, so $\dfrac{x}{6} = 3$ and $x = 18$.

**Desmos way:** graph $y = 4^{x/6} + 7$ and $y = 71$, then click the crossing at $x = 18$.

```desmos
y=4^{x/6}+7
y=71
```

### Excluded values

Any value that makes a denominator zero is not a solution, even if it looks like one. $\dfrac{1}{x - 8}$ is undefined at $x = 8$.

**Desmos way:** graph $y = \dfrac{1}{x - 8}$. The curve has a gap at $x = 8$, so that value cannot be a solution.

```desmos
y=\frac{1}{x-8}
```

### Rational equations

Multiply by the least common denominator, solve, and throw out any value that makes a denominator zero. For $\dfrac{2w}{w+3} - \dfrac{6}{w} = 1$, multiply by $w(w+3)$ to get $w^2 - 9w - 18 = 0$. Neither $0$ nor $-3$ is a root, so the solutions add to $9$.

**Desmos way:** graph $y = \dfrac{2x}{x + 3} - \dfrac{6}{x}$ and $y = 1$. Click the two crossings, near $10.68$ and $-1.68$. They add to $9$.

```desmos
y=\frac{2x}{x+3}-\frac{6}{x}
y=1
```

### Radical equations and the sign of the other side

After squaring, check that the side that was squared is not negative. For $\sqrt{6x+19} = x+2$, squaring gives $x^2 - 2x - 15 = 0$, so $x = 5$ or $x = -3$. Since $x + 2$ must be $\ge 0$, $x = -3$ is extraneous, and the only solution is $5$.

**Desmos way:** graph $y = \sqrt{6x + 19}$ and $y = x + 2$. They cross only at $x = 5$. The $x = -3$ answer never meets the root curve, which is why it is extraneous.

```desmos
y=\sqrt{6x+19}
y=x+2
```

### Literal equations with powers

Undo powers with roots. $s = \sqrt[3]{\dfrac{6V}{\pi}}$ becomes $V = \dfrac{\pi s^3}{6}$, and $r = \sqrt[3]{x^3 + y^3}$ becomes $x = \sqrt[3]{r^3 - y^3}$.

**Desmos way:** Desmos does not isolate letters, but it can check. Pick $y = 1$ and $r = 2$, so $x = \sqrt[3]{7}$. Type $\sqrt[3]{2^3 - 1^3}$ and it shows the same value, about $1.913$.

### Quadratics with a parameter

For $kx^2 + 3x + 4 = 0$ to be quadratic, $k \ne 0$. Two distinct real solutions need a positive discriminant: $9 - 16k > 0$, so $k < \dfrac{9}{16}$ and $k \ne 0$.

**Desmos way:** graph $y = kx^2 + 3x + 4$ with $k$ as a slider. At $k = 0.1$ the parabola crosses the $x$-axis twice. Drag $k$ up toward $0.5625$ and watch the two crossings merge into one.

```desmos
y=kx^2+3x+4
k=0.1
```

## Worked example 1 (easy)

Solve $x^2 - x - 12 = 0$.

1. Look for two numbers that multiply to $-12$ and add to $-1$: these are $-4$ and $3$.
2. Factor: $(x - 4)(x + 3) = 0$.
3. Set each factor to zero: $x = 4$ or $x = -3$.

Check one: $16 - 4 - 12 = 0$. Correct.

**Desmos method:** graph $y = x^2 - x - 12$ and click the two $x$-intercepts, $x = 4$ and $x = -3$.

```desmos
y=x^2-x-12
```

## Worked example 2 (SAT-level)

*For what positive value of $k$ does $x^2 - kx + 16 = 0$ have exactly one real solution?*

1. Exactly one solution means the discriminant is zero: $(-k)^2 - 4(1)(16) = 0$.
2. So $k^2 = 64$ and $k = \pm 8$.
3. The question asks for the positive value: $k = 8$.

Check: $x^2 - 8x + 16 = (x - 4)^2$, which is zero only at $x = 4$. One solution, as required.

**Desmos method:** graph $y = x^2 - kx + 16$ with $k$ as a slider. Drag $k$ until the parabola touches the $x$-axis at exactly one point. That happens at $k = 8$, the positive value the question asks for.

```desmos
y=x^2-kx+16
k=1
```

## Common traps

- **Sign errors when reading solutions from factors.** $(x + 5)$ gives $x = -5$, not $5$.
- **Forgetting the negative root.** $x^2 = 25$ has two solutions, $5$ and $-5$, unless the question restricts $x$.
- **Not checking radical equations.** After squaring $\sqrt{x + 7} = x - 5$, you get $x = 2$ and $x = 9$, but only $9$ works.
- **Answering the wrong quantity.** If the question asks for $y$, or for $k$, or for the *positive* solution, re-read before you bubble.
- **Mixing up $b$ in the discriminant.** In $2x^2 - 4x + 5$, $b = -4$, so $b^2 = 16$ (positive), and the discriminant is $16 - 40$, not $16 + 40$.

## The fast way (and when to use Desmos)

Desmos is often the fastest route on this skill:

- **Find solutions:** graph $y = $ (left side) $-$ (right side) and click the $x$-intercepts.
- **Count solutions:** graph both sides as separate equations and count intersections.
- **Find a constant:** replace the constant with a slider (type $c$ and click "add slider"), then drag until the graph does what the question describes, such as touching the $x$-axis exactly once.

Use algebra instead when the numbers are clean and the factoring is obvious, since that can be faster than typing. And when the answer choices are numbers, plugging them into the original equation is a quick check that also catches extraneous solutions.
