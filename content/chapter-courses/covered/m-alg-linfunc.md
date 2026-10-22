---
skill: m-alg-linfunc
minutes: 11
---
## What school covered

The Straight Lines chapter taught you slope as $\dfrac{y_2 - y_1}{x_2 - x_1}$, the slope as a rate of change, the $y$-intercept as a starting value, and every equation form of a line. You also met arithmetic progressions, which are linear patterns. Treat all of that as done: no lesson time on finding slopes or drawing lines.

## What school leaves out

CBSE hands you the line. The SAT hands you a situation, and the skill is building and reading the linear function the situation describes. Each item below is what the SAT asks beyond the school chapter.

**Build the function from the words.** A gym charges \$32 to join plus \$5 per session. Name the input ($n$, sessions) and the output ($C$, dollars), then write $C(n) = 5n + 32$: the rate goes with the input, the flat amount is the starting value. Most SAT questions give a story and expect this translation before anything else.

**Read a parameter as a sentence.** In $h(t) = 12 + 1.5t$, the $1.5$ means the height grows by $1.5$ cm for each extra hour, and the $12$ is the value when $t = 0$. Expect the question "what does the number $12$ represent?" The answer names the quantity and the moment: the starting height, at time zero.

**Function notation is a question, not multiplication.** $f(5) = 20$ says input $5$ gives output $20$. Never read it as $f$ times $5$. A favourite SAT wrapper is $f(a + 1)$: add first, then evaluate.

**Tables hide the slope.** If the input steps by a constant amount, the output steps by the slope times that step. A table where $x$ goes $2, 5, 8$ and $f(x)$ goes $9, 21, 33$ has slope $\dfrac{12}{3} = 4$. Read any table by checking the step size before dividing.

**Horizontal and vertical lines.** $y = 4$ is flat: every input gives $4$, so its slope is $0$. $x = 3$ is vertical: it is not a function at all, and its slope is undefined. SAT questions use these to test whether you treat $x = c$ and $y = c$ differently, often inside a word problem about a fixed quantity.

**Constraints finish the model.** A question may ask for the smallest whole $x$ with $f(x)$ over a limit, or say the model holds for $0 \le x \le 20$. The algebra is the part you know; checking the answer against the situation is the part to practise.

**Sequences are linear functions.** $a_n = a_1 + (n-1)d$ is a line through the points $(n, a_n)$. The common difference is the slope, and "how much does term 41 exceed term $17$" is a slope-times-steps question: $(41 - 17)d$.

## Worked example

A delivery service charges \$8 plus \$3 per kilometre, so $C(k) = 3k + 8$. A trip costs \$35. How far was it?

Set $3k + 8 = 35$. Subtract $8$ to get $3k = 27$, so $k = 9$ kilometres. Say the unit in the answer.

A harder one: $f$ is linear, $f(3) = 11$ and $f(7) = 27$. Find $f(10)$.

The input moved $4$ and the output moved $16$, so the slope is $4$. From $x = 7$ to $x = 10$ is $3$ more steps of $4$, so $f(10) = 27 + 12 = 39$. Check with the rule $f(x) = 4x - 1$: it fits both given values.

A table question: $g$ is linear. $x$ runs $0, 3, 6, 9$ and $g(x)$ runs $5, 14, 23, 32$. What is $g(12)$?

Steps of $3$ in $x$ give steps of $9$ in $g$, so the slope is $\dfrac{9}{3} = 3$ and $g(x) = 3x + 5$. Then $g(12) = 41$.

## Common traps

- Reading the slope as the final value. The slope is the change per one unit of input, so it always carries a "per" unit.
- Swapping the units of the rate. If $x$ is weeks, the slope is per week, not per centimetre.
- Treating $f(5) = 20$ as $5f = 20$.
- Inverting the slope formula. Rise goes on top: $y$-values in the numerator.
- Assuming the first row of a table is $x = 0$. Check where the input actually starts.
- Reporting $x = c$ lines as if they had slope zero. Vertical lines have no slope; flat lines have slope zero.

## Shortcuts and calculator checks

When a question asks for one more value, skip the full equation: count the steps and multiply by the rate. To check a line from a table, enter the table in Desmos and type `y_1 ~ mx_1 + b`. If the points really are linear the fit is exact, and Desmos hands you the slope and intercept.
