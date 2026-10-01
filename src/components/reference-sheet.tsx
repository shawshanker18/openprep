"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Markdown } from "@/components/markdown";

// Original wording of the standard SAT geometry facts (spec 04 §5.2).
const SHEET = `
| Shape | Formula |
|---|---|
| Circle | $A = \\pi r^2$, $C = 2\\pi r$ |
| Rectangle | $A = \\ell w$ |
| Triangle | $A = \\tfrac{1}{2}bh$ |
| Right triangle | $c^2 = a^2 + b^2$ |
| 30°-60°-90° | sides $x$, $x\\sqrt{3}$, $2x$ |
| 45°-45°-90° | sides $s$, $s$, $s\\sqrt{2}$ |
| Rectangular box | $V = \\ell w h$ |
| Cylinder | $V = \\pi r^2 h$ |
| Sphere | $V = \\tfrac{4}{3}\\pi r^3$ |
| Cone | $V = \\tfrac{1}{3}\\pi r^2 h$ |
| Pyramid | $V = \\tfrac{1}{3}\\ell w h$ |

A circle has $360°$, or $2\\pi$ radians. The angles of a triangle add up to $180°$.
`;

export function ReferenceSheet() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Reference</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reference sheet</DialogTitle></DialogHeader>
        <Markdown className="text-sm">{SHEET}</Markdown>
      </DialogContent>
    </Dialog>
  );
}
