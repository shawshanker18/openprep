---
skill: m-adv-nonlin-eq
minutes: 12
tags: [square-roots, factoring, discriminant, radical-equations, vertex-form, nonlinear-systems]
---
## What this skill is

Nonlinear equations are equations where the variable is squared, under a root, in a denominator, or otherwise not just multiplied by a number. On the SAT this mostly means **quadratic equations** (with an $x^2$ term), **radical equations** (with $\sqrt{\ }$), and **nonlinear systems**, where a line meets a curve. You will be asked for solutions, for the number of solutions, or for a constant that makes something true.

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

## Worked example 1 (easy)

Solve $x^2 - x - 12 = 0$.

1. Look for two numbers that multiply to $-12$ and add to $-1$: these are $-4$ and $3$.
2. Factor: $(x - 4)(x + 3) = 0$.
3. Set each factor to zero: $x = 4$ or $x = -3$.

Check one: $16 - 4 - 12 = 0$. Correct.

## Worked example 2 (SAT-level)

*For what positive value of $k$ does $x^2 - kx + 16 = 0$ have exactly one real solution?*

1. Exactly one solution means the discriminant is zero: $(-k)^2 - 4(1)(16) = 0$.
2. So $k^2 = 64$ and $k = \pm 8$.
3. The question asks for the positive value: $k = 8$.

Check: $x^2 - 8x + 16 = (x - 4)^2$, which is zero only at $x = 4$. One solution, as required.

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
