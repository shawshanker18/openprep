---
skill: m-geo-lines
minutes: 11
tags: [angle-relationships, parallel-lines, triangle-angles, isosceles, similar-triangles]
---
## What this skill is

This skill is about angle facts and triangle relationships: angles formed by intersecting lines, angles formed when a transversal cuts **parallel lines**, the **angle sum** of a triangle, **isosceles** triangles, and **similar triangles**, whose sides are proportional. Most questions combine one or two facts with a short algebra step.

## Key ideas

- Angles that form a straight line add to $180^\circ$. **Vertical angles** (opposite each other where two lines cross) are equal.
- When a transversal crosses parallel lines, every acute angle is equal and every obtuse angle is equal, and any acute angle plus any obtuse angle is $180^\circ$.
- The angles of a triangle add to $180^\circ$. An **exterior angle** equals the sum of the two interior angles that are not next to it.
- In an **isosceles** triangle, the angles opposite the equal sides are equal.
- Two triangles are **similar** if two pairs of angles match (AA). Then all corresponding sides share one ratio.
- A segment drawn parallel to one side of a triangle cuts off a smaller triangle similar to the whole.

## Formulas and rules

| Angle pair (parallel lines) | Relationship |
|---|---|
| corresponding | equal |
| alternate interior | equal |
| same-side interior | add to $180^\circ$ |

- Triangle: $\angle A + \angle B + \angle C = 180^\circ$.
- Exterior angle at $C$: $180^\circ - \angle C = \angle A + \angle B$.
- Similar triangles: $\frac{AB}{DE} = \frac{BC}{EF} = \frac{AC}{DF}$, listed in matching order.
- Right triangle with altitude to the hypotenuse: the altitude $h$ splits the hypotenuse into $p$ and $q$ with $h^2 = pq$.

## Worked example 1 (easy)

The angles of a triangle measure $(2x + 10)^\circ$, $(3x - 5)^\circ$, and $(x + 25)^\circ$. Find each angle.

1. Add and set equal to $180$: $6x + 30 = 180$, so $6x = 150$ and $x = 25$.
2. The angles are $2(25) + 10 = 60^\circ$, $3(25) - 5 = 70^\circ$, and $25 + 25 = 50^\circ$.

Check: $60 + 70 + 50 = 180$. Correct.

## Worked example 2 (SAT-level)

*In triangle $PQR$, point $S$ is on $\overline{PQ}$ and point $T$ is on $\overline{PR}$, with $\overline{ST}$ parallel to $\overline{QR}$. If $PS = 6$, $SQ = 4$, and $ST = 9$, what is $QR$?*

1. Because $\overline{ST} \parallel \overline{QR}$, the corresponding angles match, so triangle $PST$ is similar to triangle $PQR$.
2. Match the sides from the shared vertex $P$: $PS$ corresponds to the **whole** side $PQ = 6 + 4 = 10$.
3. Set up the ratio: $\frac{ST}{QR} = \frac{PS}{PQ}$, so $\frac{9}{QR} = \frac{6}{10}$.
4. Cross-multiply: $6 \cdot QR = 90$, so $QR = 15$.

Check: the scale factor from the small triangle to the large one is $\frac{10}{6} = \frac{5}{3}$, and $9 \cdot \frac{5}{3} = 15$. Correct.

## Common traps

- **Using the piece instead of the whole side.** In example 2, comparing $PS$ to $SQ$ gives $\frac{9}{QR} = \frac{6}{4}$ and the wrong answer $6$.
- **Mismatching corresponding sides.** Write the similarity in vertex order ($\triangle PST \sim \triangle PQR$) and read sides in the same order.
- **Assuming same-side interior angles are equal.** They add to $180^\circ$; only alternate and corresponding angles are equal.
- **Picking the wrong equal angles in an isosceles triangle.** The equal angles are opposite the equal sides — the angle *between* the equal sides is the different one.
- **Answering $x$ instead of the angle.** After solving for $x$, substitute back if the question asks for an angle measure.

## The fast way (and when to use Desmos)

Desmos rarely helps here; there is usually no equation to graph until you write one yourself. The fast way is to **mark the diagram**:

- Label every angle you can with a number or expression before solving: vertical angles, straight-line pairs, the third angle of each triangle.
- With parallel lines, decide quickly whether two angles look equal (both acute or both obtuse) or supplementary (one of each).
- For similar triangles, write one ratio with the unknown on top and solve with one cross-multiplication.

If a question leads to a messy equation such as $\frac{x + 3}{12} = \frac{8}{x - 1}$, Desmos can solve it: graph $y = \frac{x + 3}{12}$ and $y = \frac{8}{x - 1}$ and click the intersection where $x$ makes sense as a length. For ordinary angle equations, algebra is faster.
