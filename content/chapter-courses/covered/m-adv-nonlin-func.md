---
skill: m-adv-nonlin-func
minutes: 9
---
## What school covered

Relations and Functions gave you function notation, evaluating $f(x)$, domain and range, and the shapes of polynomial, quadratic, simple rational, modulus and exponential graphs. Sequences and Series showed geometric progressions, repeated multiplication by a common ratio. All of that is assumed here.

## What school leaves out

CBSE teaches what these functions are. The SAT asks what they mean in a situation and how their forms connect, and that interpretation work is new.

- **Vertex, minimum and maximum.** For $f(x) = ax^2 + bx + c$, the vertex sits at $x = -\dfrac{b}{2a}$. If $a > 0$ the vertex is a minimum; if $a < 0$ it is a maximum. In a revenue or height story, the vertex answer is read with a unit and a direction.
- **Pick the form that answers the question.** Standard $ax^2 + bx + c$ for the value at a point, factored $a(x - r_1)(x - r_2)$ for the zeros, vertex $a(x - h)^2 + k$ for the extreme value. Rewriting between them is the work.
- **Exponential in context.** $f(t) = 12(2)^t$ starts at $12$ and doubles each period. Growth by a factor is not adding: $f(t) = 12(1.08)^t$ grows by $8$ percent per period, not by $8$ units.
- **Which model fits a table?** Equal differences in the output for equal input steps point to linear. Equal ratios point to exponential. Quadratic shows a constant second difference. This decision is pure SAT material.
- **Domain from the situation.** Algebra may allow any $x$, but a ticket count or a number of people cannot be negative or fractional. Expect a question where the sensible domain decides the answer.
- **Representations move together.** Be ready to jump from table to graph to equation in one question: which graph matches this table, which formula matches this description.

## Worked example

A ball's height in metres is $h(t) = -5t^2 + 20t + 1$. At what time is it highest, and how high?

The vertex is at $t = -\dfrac{20}{2(-5)} = 2$. Then $h(2) = -20 + 40 + 1 = 21$ metres at $2$ seconds. The negative $a$ already told us it opens downward, so the vertex is a maximum.

Another: a sample of 80 bacteria doubles every 3 hours, and a table shows 80, 160, 320 for $t = 0, 3, 6$. Which model fits, and what is the population at 12 hours?

The output doubles each 3-hour step: constant ratio, so exponential, $P(t) = 80 \cdot 2^{t/3}$. At $t = 12$: $80 \cdot 2^4 = 1280$. A linear reader would have answered 320 plus differences and been wrong in a way the SAT counts on.

## Common traps

- Confusing the growth rate with the growth factor. $1.08$ means $8$ percent growth; writing $f(t) = 12(8)^t$ is the classic slip.
- Mixing up the sign of the vertex coordinate: the vertex $x$ is $-\dfrac{b}{2a}$, and students drop the minus.
- Reading a minimum question as asking for the $x$-value when it wants the output. Check which one the question names.
- Calling every fast-growing table exponential without checking that the ratio is constant.
- Forgetting the context domain: predicting bacteria at $t = -2$ makes no sense.

## Shortcuts and calculator checks

In Desmos, plot the model and click the curve to read the maximum or minimum directly. For a table, enter it and try a regression: `y_1 ~ a(x_1 - h)^2 + k` fits a quadratic and reports the vertex, and `y_1 ~ a \cdot b^{x_1}` fits an exponential and reports the factor.
