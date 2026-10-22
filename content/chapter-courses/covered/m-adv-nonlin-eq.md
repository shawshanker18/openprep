---
skill: m-adv-nonlin-eq
minutes: 12
---
## What school covered

You solved quadratic equations in Class 10 and again with real roots in Class 11, and the Conic Sections chapter showed you the parabola $y = ax^2 + bx + c$. Factoring and the quadratic formula are assumed. Imaginary roots are not SAT material, so nothing is lost by skipping them.

## What school leaves out

The SAT's nonlinear-equation skill runs far past quadratics, and the syllabus stops at the quadratic. Everything below is SAT territory the chapter never reaches. Learn it here, properly, with the checks.

**Completing the square.** Rewrite $x^2 + 6x + 11$ as $(x + 3)^2 + 2$. It finds vertices, solves equations the formula makes ugly, and appears inside circle and quadratic questions constantly. The move: halve the linear coefficient, square it, fold it in, balance the constants.

**Absolute-value equations.** $|x - 4| = 9$ splits into $x - 4 = 9$ or $x - 4 = -9$, so $x = 13$ or $x = -5$. And $|anything| = $ a negative has no solution at all, because absolute value is never negative. Two cases and a no-solution check, every time.

**Rational equations.** Multiply out the denominators, but track excluded values: in $\dfrac{1}{x - 2} + \dfrac{3}{x + 1} = 2$, neither $x = 2$ nor $x = -1$ can be an answer. A solution that lands on an excluded value is extraneous, and the SAT counts on you forgetting to check.

**Radical equations.** Solve $\sqrt{x + 6} = x$ by squaring: $x + 6 = x^2$, so $x^2 - x - 6 = 0$, giving $(x - 3)(x + 2) = 0$. Check both: $x = 3$ works, $x = -2$ gives $\sqrt{4} = 2$, which is not $-2$. Squaring added that root. Always check.

**Factored higher-degree equations.** $(x - 2)(x^2 - 9) = 0$ is three solutions waiting: $x = 2$, $x = 3$, $x = -3$. Zero product beats expanding every time, and the question is as often "how many solutions" as "which solutions".

**Linear and nonlinear systems.** Substitute the line into the curve: with $y = x + 1$ and $x^2 + y^2 = 25$, substitute to get $x^2 + (x + 1)^2 = 25$. Expect to count intersections as often as you compute them; the discriminant answers the count without solving.

**Rearrange a formula.** Solve $A = \pi r^2$ for $r$, or $F = \dfrac{9}{5}C + 32$ for $C$. Treat the other letters as numbers and isolate the one you want, exactly like Class 9 literal equations but under time pressure.

## Worked example

Solve $\sqrt{x + 6} = x$.

Square: $x + 6 = x^2$, so $x^2 - x - 6 = 0$, giving $(x - 3)(x + 2) = 0$ and $x = 3$ or $x = -2$. Check both: $x = 3$ gives $\sqrt{9} = 3$, which holds. $x = -2$ gives $\sqrt{4} = 2$, which is not $-2$. Squaring added that root, so it is extraneous. One solution: $x = 3$.

A rational one: $\dfrac{6}{x} = x - 1$.

Multiply by $x$: $6 = x^2 - x$, so $x^2 - x - 6 = 0$ and $(x - 3)(x + 2) = 0$. Neither candidate is $0$, so both are valid: $x = 3$ or $x = -2$.

A system: how many real solutions does the system $y = x^2 - 2$ and $y = 2x$ have?

Set $x^2 - 2 = 2x$, so $x^2 - 2x - 2 = 0$. The discriminant is $4 + 8 = 12 > 0$, so two real solutions. No need to find them.

A rearrangement: solve $v = v_0 + at$ for $t$.

Subtract $v_0$: $v - v_0 = at$. Divide by $a$: $t = \dfrac{v - v_0}{a}$. One line, and SAT often wants exactly this from a physics-flavoured formula.

## Common traps

- Forgetting to check after squaring or after multiplying by a denominator. Extraneous roots are not a maybe; they are a designed trap.
- Dividing both sides by $x$ and losing the $x = 0$ root. Factor instead.
- Splitting $|x| = 5$ into only $x = 5$ and forgetting $x = -5$.
- Expanding a factored equation like $(x - 2)(x^2 - 9) = 0$ into a cubic. The factored form already is the answer key.
- Reporting the count of solutions as the solutions themselves, or vice versa. Read the question's last line.

## Shortcuts and calculator checks

For solve-and-count questions, graph both sides in Desmos and count intersections; for radicals, the intersection's $x$-value is the root that survives, a fast way to see which candidate is extraneous. Desmos also solves any of these typed as-is, which is a check, not a substitute for the algebra on no-calculator-style reasoning.
