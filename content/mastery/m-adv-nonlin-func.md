---
skill: m-adv-nonlin-func
minutes: 13
tags: [models, vertex, exponential-vs-linear, composition]
---
## What this skill is

Nonlinear functions model curved and growing quantities. At mastery level you interpret the vertex, the intercepts and the growth pattern in a situation, and you decide which model fits better.

> **Build the model first.** Name what the input and output measure, then identify the shape from the description: a turning point suggests a quadratic, and a constant percent change suggests an exponential.

## Learn the idea

**Try this first.** Plan A grows as $100 + 20t$. Plan B grows as $100(1.2)^t$. Which is larger at $t = 10$, and do they ever match?

**Let's reason it through.**

1. Compute both at $t = 10$. Plan A gives $100 + 200 = 300$. Plan B gives $100(1.2)^{10} \approx 619$. So Plan B is larger.
2. Why does Plan B pull ahead? Because each period multiplies the amount, so the growth accelerates, while Plan A adds the same amount each time.
3. Check when they match: set $100 + 20t = 100(1.2)^t$. At $t = 0$ both are $100$. At $t = 1$ both are $120$.
4. So they meet at the start and after one period, and Plan B is bigger after that.

**Your turn.** The height of a ball is $h(t) = -16t^2 + 64t + 5$. When is it highest, and how high does it get?

**Answer:** The vertex is at $t = -\dfrac{64}{2(-16)} = 2$. Then $h(2) = -64 + 128 + 5 = 69$. The ball is highest at 2 seconds, at 69 feet.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Vertex | $x = -\dfrac{b}{2a}$ for $ax^2 + bx + c$ |
| Constant percent change | $A(1 + r)^t$ grows by $r$ each period. |
| Linear vs exponential | Linear models add a fixed amount. Exponential models multiply by a fixed factor. |

**Desmos check, step by step:**

1. Type $y = -16x^2 + 64x + 5$.
2. Click the highest point. The vertex is at $x = 2$, and the height there is $69$.

```desmos-open
y=-16x^2+64x+5
```

## Worked example 1 (easy)

*For $f(x) = x^2 - 4x + 3$, find the vertex and the zeros, and say what the zeros mean in terms of the graph.*

1. Vertex: $x = -\dfrac{-4}{2} = 2$, and $f(2) = 4 - 8 + 3 = -1$.
2. Zeros: $x^2 - 4x + 3 = (x - 1)(x - 3) = 0$, so $x = 1$ and $x = 3$.
3. The zeros are where the parabola crosses the horizontal axis, and the vertex sits halfway between them.

## Worked example 2 (SAT-level)

*A population starts at $500$ and doubles every $5$ years. Write a model and find the population after $15$ years.*

1. Model: $P(t) = 500 \cdot 2^{t/5}$, since each $5$ years multiplies by $2$.
2. Evaluate: $t = 15$ gives $500 \cdot 2^{3} = 4000$.
3. Check: three doublings from $500$ give $500, 1000, 2000, 4000$.

## Common traps

- **Using the percent as the factor.** A $20\%$ increase is $1.2$, not $0.2$.
- **Confusing the vertex with a zero.** The vertex is the turning point, and the zeros are where the curve crosses the axis.
- **Choosing a linear model for a doubling pattern.** Doubling is exponential, even when the first few values look close to a line.

## The fast way (and when to use Desmos)

Graph both candidate models and look at how they behave for large inputs. The picture shows which one grows faster and where they cross. Use the vertex formula to read the turning point exactly.
