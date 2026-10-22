---
skill: m-alg-linfunc
minutes: 9
---
## What school covered

The Straight Lines chapter taught you slope as $\dfrac{y_2 - y_1}{x_2 - x_1}$, the slope as a rate of change, the $y$-intercept as a starting value, and every equation form of a line. You also met arithmetic progressions, which are linear patterns. Treat all of that as done: no lesson time on finding slopes or drawing lines.

## What school leaves out

The SAT rarely hands you an equation. It hands you a situation, and the skill is building and reading the linear function the situation describes.

- **Build the function from the words.** A gym charges \$32 to join plus \$5 per session. That is $C(n) = 5n + 32$: the rate goes with the input, the flat amount is the starting value. Name the input and the output before you write anything.
- **Read a parameter as a sentence.** In $h(t) = 12 + 1.5t$, the $1.5$ means the height grows by $1.5$ cm for each extra hour. Expect questions like "what does the $12$ mean?" The answer names the quantity when $t = 0$: the starting height.
- **Function notation is a question, not multiplication.** $f(5) = 20$ says input $5$ gives output $20$. Never read it as $f$ times $5$.
- **Tables hide the slope.** If the input steps by a constant amount, the output steps by the slope times that step. A table where $x$ goes $2, 5, 8$ and $f(x)$ goes $9, 21, 33$ has slope $\dfrac{12}{3} = 4$ per step of $1$.
- **Constraints are part of the model.** A question may ask for the smallest whole $x$ with $f(x)$ over a limit. The algebra is the part you know; the checking against the situation is the part to practise.
- **Sequences are linear functions in disguise.** $a_n = a_1 + (n-1)d$ is a line through the points $(n, a_n)$. The common difference is the slope.

## Worked example

A delivery service charges \$8 plus \$3 per kilometre, so $C(k) = 3k + 8$. A trip costs \$35. How far was it?

Set $3k + 8 = 35$. Subtract $8$ to get $3k = 27$, so $k = 9$ kilometres. Say the unit in the answer.

A harder one: $f$ is linear, $f(3) = 11$ and $f(7) = 27$. Find $f(10)$.

The input moved $4$ and the output moved $16$, so the slope is $4$. From $x = 7$ to $x = 10$ is $3$ more steps of $4$, so $f(10) = 27 + 12 = 39$. Check with the rule $f(x) = 4x - 1$: it fits both given values.

## Common traps

- Reading the slope as the final value. The slope is the change per one unit of input, so it always carries a "per" unit.
- Swapping the units of the rate. If $x$ is weeks, the slope is per week, not per centimetre.
- Treating $f(5) = 20$ as $5f = 20$.
- Inverting the slope formula. Rise goes on top: $y$-values in the numerator.
- Missing that the starting value is the output at input zero, not the first value listed in a table.

## Shortcuts and calculator checks

When a question asks for one more value, skip the full equation: count the steps and multiply by the rate. To check a line from a table, enter the table in Desmos and type `y_1 ~ mx_1 + b`. If the points really are linear the fit is exact, and Desmos hands you the slope and intercept.
