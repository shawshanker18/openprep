---
skill: m-geo-lines
minutes: 11
tags: [angle-relationships, parallel-lines, triangle-angles, isosceles, similar-triangles]
---
## What this skill is

This skill is about angle facts and triangle relationships: angles formed by intersecting lines, angles formed when a transversal cuts **parallel lines**, the **angle sum** of a triangle, **isosceles** triangles, and **similar triangles**, whose sides are proportional. Most questions combine one or two facts with a short algebra step.

> **Build the proportion first.** The SAT shows a diagram and asks about a length or angle, so write the relationship from the diagram before solving.
>
> 1. Mark the angles and sides you know.
> 2. Write the ratio: a segment parallel to a side gives $\frac{ST}{QR} = \frac{PS}{PQ}$.
> 3. Solve only after the ratio is written.

## Learn the idea

**Try this first.** Two angles of a triangle are $50^\circ$ and $60^\circ$. How big is the third angle? Then say why you know.

**Let's work it out.**

1. Why do the angles of a triangle add to $180^\circ$? Picture a straight line. The three corners of a triangle fit together along one straight edge, and a straight line is $180^\circ$.
2. So the third angle is what is left over: $180^\circ - 50^\circ - 60^\circ$.
3. Compute: $180 - 110 = 70^\circ$.
4. Check the reasoning: adding all three should give $180$. $50 + 60 + 70 = 180$.
5. This one fact is used everywhere. Whenever two angles are known, the third follows immediately.

**Your turn.** A triangle has angles $90^\circ$ and $35^\circ$. Find the third angle, and explain why it is the one left over.

**Answer:** $180 - 90 - 35 = 55^\circ$. Because the triangle has a right angle, the two other angles must share the remaining $90^\circ$, so $35 + 55 = 90$.

## Formulas and rules

**Key formulas and rules**

| Rule | What it says |
|---|---|
| Triangle angle sum | The angles of a triangle add to $180^\circ$. |
| Exterior angle | An exterior angle equals the sum of the two non-adjacent interior angles. |
| Similar triangles | Corresponding sides are in the same ratio. |
| Midsegment | A segment joining two midpoints is parallel to the third side and half its length. |

**Desmos check for a midsegment, step by step:**

1. Plot the triangle's corners $(0, 0)$, $(8, 0)$ and $(2, 5)$.
2. Plot the midpoints $(1, 2.5)$ of one side and $(5, 2.5)$ of another. The segment between them is $4$ long, which is half of the base, $8$.

```desmos-open
(0,0)
(8,0)
(2,5)
(1,2.5)
(5,2.5)
```

| Angle pair (parallel lines) | Relationship |
|---|---|
| corresponding | equal |
| alternate interior | equal |
| same-side interior | add to $180^\circ$ |

- Triangle: $\angle A + \angle B + \angle C = 180^\circ$.
- Exterior angle at $C$: $180^\circ - \angle C = \angle A + \angle B$.
- Similar triangles: $\frac{AB}{DE} = \frac{BC}{EF} = \frac{AC}{DF}$, listed in matching order.
- Right triangle with altitude to the hypotenuse: the altitude $h$ splits the hypotenuse into $p$ and $q$ with $h^2 = pq$.

### Midsegments

A segment joining the midpoints of two sides of a triangle is parallel to the third side and half its length. If $D$ and $E$ are the midpoints of $\overline{AB}$ and $\overline{BC}$, then $AC = 2 \cdot DE$.

**Desmos way:** plot $A(0, 0)$, $B(4, 6)$, $C(8, 0)$, and the midpoints $D(2, 3)$ and $E(6, 3)$. Desmos shows $DE = 4$ and $AC = 8$, so $AC = 2 \cdot DE$.

```desmos
(0,0)
(4,6)
(8,0)
(2,3)
(6,3)
```

### The triangle inequality

The two shorter sides must add to more than the third side. For sides $9$ and $15$, the third side $x$ satisfies $6 < x < 24$.

**Desmos way:** type $15 + 9$ and $15 - 9$. Desmos shows $24$ and $6$, the two bounds on the third side.

### Congruent triangles

Two triangles are congruent when they match by SSS (three sides), SAS (two sides and the angle between them), ASA or AAS (two angles and a side), or HL (right triangles with a matching hypotenuse and leg). Two angles alone never prove congruence, because they only prove similarity.

**Desmos way:** Desmos cannot prove congruence, but it can measure. Type the side lengths of both triangles. Three equal pairs confirm SSS.

### Isosceles triangles

The two equal sides are the legs. With perimeter $53$ and two sides of $17$, the third side is $53 - 34 = 19$.

**Desmos way:** type $53 - 2 \cdot 17$. Desmos shows $19$.

### Dilations

A dilation multiplies every length by the scale factor, but leaves every angle the same size.

**Desmos way:** plot $(0, 0)$, $(3, 0)$, $(0, 4)$ and then $(0, 0)$, $(6, 0)$, $(0, 8)$. The second triangle is the first doubled, and its slopes match.

```desmos
(0,0)
(3,0)
(0,4)
(6,0)
(0,8)
```

### Corresponding parts of congruent triangles

Once two triangles are congruent, every matching pair of sides and angles is equal. Use the stated correspondence (which vertex matches which) to find the matching side or angle.

**Desmos way:** plot both triangles with the stated vertex order. Matching sides should have the same length, which you can check by typing each distance.

### Parallelograms

Opposite sides are equal, opposite angles are equal, and adjacent angles add to $180^\circ$.

**Desmos way:** Desmos does not check angles directly. Type the side lengths and use the distance formula to test the parallelogram's opposite sides.

### Perpendicular bisectors

Every point on the perpendicular bisector of a segment is the same distance from the segment's two endpoints.

**Desmos way:** plot the endpoints $(-2, 0)$ and $(4, 0)$ and the bisector $x = 1$. Any point on $x = 1$ is equally far from both endpoints.

```desmos
(-2,0)
(4,0)
x=1
```

## Worked example 1 (easy)

The angles of a triangle measure $(2x + 10)^\circ$, $(3x - 5)^\circ$, and $(x + 25)^\circ$. Find each angle.

1. Add and set equal to $180$: $6x + 30 = 180$, so $6x = 150$ and $x = 25$.
2. The angles are $2(25) + 10 = 60^\circ$, $3(25) - 5 = 70^\circ$, and $25 + 25 = 50^\circ$.

Check: $60 + 70 + 50 = 180$. Correct.

**Desmos method:** graph $y = 6x + 30$ and $y = 180$. They cross at $x = 25$, so the angles are $60^\circ$, $70^\circ$, and $50^\circ$.

```desmos
y=6x+30
y=180
```

## Worked example 2 (SAT-level)

*In triangle $PQR$, point $S$ is on $\overline{PQ}$ and point $T$ is on $\overline{PR}$, with $\overline{ST}$ parallel to $\overline{QR}$. If $PS = 6$, $SQ = 4$, and $ST = 9$, what is $QR$?*

1. Because $\overline{ST} \parallel \overline{QR}$, the corresponding angles match, so triangle $PST$ is similar to triangle $PQR$.
2. Match the sides from the shared vertex $P$: $PS$ corresponds to the **whole** side $PQ = 6 + 4 = 10$.
3. Set up the ratio: $\frac{ST}{QR} = \frac{PS}{PQ}$, so $\frac{9}{QR} = \frac{6}{10}$.
4. Cross-multiply: $6 \cdot QR = 90$, so $QR = 15$.

Check: the scale factor from the small triangle to the large one is $\frac{10}{6} = \frac{5}{3}$, and $9 \cdot \frac{5}{3} = 15$. Correct.

**Desmos method:** type $9 \cdot \dfrac{10}{6}$. Desmos shows $15$, which is $QR$, because the small triangle is $\tfrac{6}{10}$ of the large one.

## Common traps

- **Using the piece instead of the whole side.** In example 2, comparing $PS$ to $SQ$ gives $\frac{9}{QR} = \frac{6}{4}$ and the wrong answer $6$.
- **Mismatching corresponding sides.** Write the similarity in vertex order ($\triangle PST \sim \triangle PQR$) and read sides in the same order.
- **Assuming same-side interior angles are equal.** They add to $180^\circ$; only alternate and corresponding angles are equal.
- **Picking the wrong equal angles in an isosceles triangle.** The equal angles are opposite the equal sides. The angle *between* the equal sides is the different one.
- **Answering $x$ instead of the angle.** After solving for $x$, substitute back if the question asks for an angle measure.

## The fast way (and when to use Desmos)

Desmos rarely helps here; there is usually no equation to graph until you write one yourself. The fast way is to **mark the diagram**:

- Label every angle you can with a number or expression before solving: vertical angles, straight-line pairs, the third angle of each triangle.
- With parallel lines, decide quickly whether two angles look equal (both acute or both obtuse) or supplementary (one of each).
- For similar triangles, write one ratio with the unknown on top and solve with one cross-multiplication.

If a question leads to a messy equation such as $\frac{x + 3}{12} = \frac{8}{x - 1}$, Desmos can solve it: graph $y = \frac{x + 3}{12}$ and $y = \frac{8}{x - 1}$ and click the intersection where $x$ makes sense as a length. For ordinary angle equations, algebra is faster.
