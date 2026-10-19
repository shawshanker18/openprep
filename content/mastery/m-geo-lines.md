---
skill: m-geo-lines
minutes: 12
tags: [parallel-lines, angle-chains, similar-triangles, proportions]
---
## What this skill is

Angle and triangle questions chain a few facts together. At mastery level you choose the right fact to start from and carry the result to the next step.

> **Find the chain first.** Name the fact that starts the chain, then the next fact it unlocks.

## Learn the idea

**Try this first.** Two parallel lines are cut by a transversal, and one angle is $65^\circ$. What is the co-interior angle on the same side?

**Let's reason it through.**

1. Identify the angle pair: the co-interior angles lie on the same side of the transversal and between the parallel lines. Why do they matter? They are linked by a fact about parallel lines.
2. The fact: co-interior angles add to $180^\circ$. A straight line is $180^\circ$, and the parallel lines make the two angles sit along one straight edge.
3. So the co-interior angle is $180^\circ - 65^\circ = 115^\circ$.
4. Check: $65^\circ$ and $115^\circ$ together make a straight line, as expected.

**Your turn.** In triangle $ABC$, $DE \parallel BC$, with $AD = 3$, $DB = 2$, and $DE = 4$. Find $BC$.

**Answer:** Similar triangles $ADE$ and $ABC$ give $\dfrac{BC}{DE} = \dfrac{AB}{AD} = \dfrac{5}{3}$. So $BC = 4 \cdot \dfrac{5}{3} = \dfrac{20}{3}$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Co-interior angles | On parallel lines with a transversal, they add to $180^\circ$. |
| Similar triangles | A line parallel to one side makes a smaller triangle similar to the whole. |
| Triangle sum | The angles of a triangle add to $180^\circ$. |

**Desmos check, step by step:**

1. Plot $A(0, 6)$, $B(-3, 0)$ and $C(3, 0)$.
2. Plot $D(-1.5, 3)$ and $E(1.5, 3)$, the midpoints of $AB$ and $AC$. The segment $DE$ is parallel to $BC$, and its length $3$ is half of $BC$, which is $6$.

```desmos-open
(0,6)
(-3,0)
(3,0)
(-1.5,3)
(1.5,3)
```

## Worked example 1 (easy)

*In a triangle, two angles are $35^\circ$ and $75^\circ$. Find the third angle, and say which fact you used.*

1. Use the triangle sum: $180^\circ - 35^\circ - 75^\circ = 70^\circ$.
2. The fact is that the angles of a triangle always add to $180^\circ$.

## Worked example 2 (SAT-level)

*An isosceles triangle has apex angle $40^\circ$. Find each base angle, and explain why the two base angles are equal.*

1. Triangle sum: the base angles share $180^\circ - 40^\circ = 140^\circ$.
2. The triangle is isosceles, so the two base angles are equal, and each is $70^\circ$.
3. The equal angles sit opposite the equal sides, which is why the reasoning works.

## Common traps

- **Using the piece instead of the whole side.** In similar triangles, compare the big side to the big side.
- **Assuming same-side angles are equal.** On parallel lines they add to $180^\circ$.
- **Stopping one step early.** Find the angle the question asks for, not an intermediate one.

## The fast way (and when to use Desmos)

Mark the diagram first: label each angle you know and each side you know. Then choose the fact that unlocks the most. Use Desmos to check coordinates when a diagram is given on a grid.
