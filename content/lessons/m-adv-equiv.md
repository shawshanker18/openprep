---
skill: m-adv-equiv
minutes: 12
tags: [expanding, factoring, exponent-rules, rational-expressions]
---
## What this skill is

Two expressions are **equivalent** if they give the same value for every allowed $x$. This skill is about rewriting: **expanding** products, **factoring** polynomials, simplifying with **exponent rules**, and reshaping **rational expressions** (fractions with polynomials). Most questions show one expression and ask which choice equals it, or ask for a constant that makes two forms match.

## Key ideas

- Expanding means multiplying every term in one factor by every term in the other, then combining like terms.
- Factoring is expanding in reverse. For $ax^2 + bx + c$, find two numbers that multiply to $ac$ and add to $b$, then split the middle term.
- If two polynomials are equal for all $x$, their matching coefficients are equal. This lets you solve for unknown constants.
- Radicals are fractional exponents: $\sqrt[n]{x^m} = x^{m/n}$. Convert, then use exponent rules.
- To simplify a rational expression, factor top and bottom and cancel common **factors**. Never cancel individual terms.

## Formulas and rules

| Rule | Example |
|---|---|
| $x^a \cdot x^b = x^{a+b}$ | $x^2 \cdot x^5 = x^7$ |
| $\frac{x^a}{x^b} = x^{a-b}$ | $\frac{x^6}{x^2} = x^4$ |
| $(x^a)^b = x^{ab}$ | $(3x^2)^3 = 27x^6$ |
| $x^{-a} = \frac{1}{x^a}$ | $x^{-2} = \frac{1}{x^2}$ |

- $(a + b)^2 = a^2 + 2ab + b^2$ and $(a - b)^2 = a^2 - 2ab + b^2$.
- $a^2 - b^2 = (a + b)(a - b)$.
- Factoring by splitting: $2x^2 + 7x + 3$ has $ac = 6$; use $6$ and $1$: $2x^2 + 6x + x + 3 = (2x + 1)(x + 3)$.
- Exponent example: $\frac{x^2 \cdot \sqrt[3]{x}}{\sqrt{x^3}} = x^{2 + \frac{1}{3} - \frac{3}{2}} = x^{5/6}$.
- **Splitting a fraction whose top is not a multiple of the bottom:** divide the top by the bottom as you would numbers. Ask "what times $x + 2$ gives the top's $x$-term?" Here that is $3$: $3(x + 2) = 3x + 6$. The leftover is the remainder, so $3x - 4 = 3(x + 2) + (-10)$, and $\frac{3x - 4}{x + 2} = 3 + \frac{-10}{x + 2}$. The remainder is the constant $A = -10$. This form is how SAT questions reveal a hidden constant.

### Complex fractions

A fraction inside a fraction: multiply the top and bottom by the least common denominator of every inner fraction. For $\dfrac{q/r + 3}{r/q + 2}$, multiply top and bottom by $rq$: the top becomes $q^2 + 3rq$ and the bottom becomes $r^2 + 2rq$, so the result is $\dfrac{q(q + 3r)}{r(r + 2q)}$.

### Subtracting polynomials

Subtracting a group flips the sign of every term inside it. $(7t^4 - 2t^2 + 5t - 8) - (3t^4 - 5t^3 + 4t^2 - 8) = 4t^4 + 5t^3 - 6t^2 + 5t$.

### Rearranging a formula

Undo operations to isolate the letter you want, treating the other letters as numbers. From $ak = \dfrac{b}{6}(7 + m)$: multiply by $\dfrac{6}{b}$ to get $\dfrac{6ak}{b} = 7 + m$, so $m = \dfrac{6ak}{b} - 7$.

### Exponents with the same base

If $b^x = b^y$ with $b \ne 1$, then $x = y$. Write both sides as powers of one base first: $\sqrt[7]{2^3} = 2^{3/7}$, so $2^a = 2^{3/7}$ gives $a = \dfrac{3}{7}$.

### Factors

$x + m$ is a factor of an expression exactly when substituting $x = -m$ makes the expression equal $0$.

### Adding rational expressions

Factor each denominator, find the least common denominator, then combine. For $\dfrac{2}{x^2-4} + \dfrac{1}{x^2+6x+8}$, the denominators are $(x-2)(x+2)$ and $(x+2)(x+4)$, so the sum is $\dfrac{2(x+4) + (x-2)}{(x-2)(x+2)(x+4)} = \dfrac{3(x+2)}{(x-2)(x+2)(x+4)} = \dfrac{3}{(x-2)(x+4)}$.

### Simplifying radicals

Combine like terms under the root first, then pull out perfect squares or cubes. $\sqrt{36h^2 + 64h^2} = \sqrt{100h^2} = 10h$ for $h \ge 0$. Never split a sum under a root: $\sqrt{a+b} \ne \sqrt{a} + \sqrt{b}$. Cube roots work the same way: $\sqrt[3]{40v^6w^7} = 2v^2w^2\sqrt[3]{5w}$.

### Variable exponents

Factor the base into primes first. Since $675 = 3^3 \cdot 5^2$, we get $675^{mn} = 3^{3mn} \cdot 5^{2mn} = (3^m)^{3n} (5^n)^{2m} = x^{3n} y^{2m}$.

## Worked example 1 (easy)

Write $(2x - 3)(4x + 1) - 5x$ in the form $ax^2 + bx + c$.

1. Expand: $(2x)(4x) + (2x)(1) + (-3)(4x) + (-3)(1) = 8x^2 + 2x - 12x - 3$.
2. Combine: $8x^2 - 10x - 3$.
3. Subtract $5x$: $8x^2 - 15x - 3$.

Check with $x = 1$: the original is $(-1)(5) - 5 = -10$, and $8 - 15 - 3 = -10$. Correct.

## Worked example 2 (SAT-level)

*The expression $\frac{3x - 4}{x + 2}$ can be rewritten as $3 + \frac{A}{x + 2}$, where $A$ is a constant. What is $A$?*

1. Write the numerator in terms of the denominator: $3x - 4 = 3(x + 2) - 10$.
2. Split the fraction: $\frac{3(x + 2) - 10}{x + 2} = 3 - \frac{10}{x + 2}$.
3. So $A = -10$.

Check with $x = 0$: the original gives $\frac{-4}{2} = -2$, and $3 + \frac{-10}{2} = -2$. Correct.

## Common traps

- **Squaring term by term.** $(x + 6)^2$ is $x^2 + 12x + 36$, not $x^2 + 36$.
- **Losing a negative when distributing a subtraction.** $-3(x - 5) = -3x + 15$.
- **Multiplying exponents that should be added.** $x^2 \cdot x^3 = x^5$, not $x^6$.
- **Forgetting the coefficient in a power.** $(2x^5)^3 = 8x^{15}$; the $2$ is cubed too.
- **Canceling terms instead of factors.** In $\frac{x^2 - 16}{x^2 + 7x + 12}$, you cannot cancel the $x^2$; factor to $\frac{(x - 4)(x + 4)}{(x + 3)(x + 4)}$, then cancel $(x + 4)$.

## The fast way (and when to use Desmos)

Desmos is a reliable equivalence checker:

- **Compare graphs:** graph the original as $y = \ldots$ and then each answer choice. The equivalent choice draws exactly on top of the original.
- **Spot-check with a value:** in Desmos or by hand, evaluate the original and each choice at a test value like $x = 2$. Wrong choices almost always give different numbers. Avoid $x = 0$ and $x = 1$, where different powers can tie.
- **Factors:** graph the polynomial and click its $x$-intercepts. An intercept at $x = \frac{4}{3}$ means $(3x - 4)$ is a factor.

Use algebra when the rewrite is a single expansion or one exponent rule, because that is faster than typing five expressions. Note that Desmos does not draw the "hole" where a canceled factor was zero, so read domain restrictions from the question.
