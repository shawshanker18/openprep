import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "./normalize-markdown";
import { isSatDate, upcomingSatDates } from "./sat-dates";

describe("imported question formatting", () => {
  it("turns literal newlines into line breaks while preserving math commands", () => {
    expect(normalizeMarkdown(String.raw`First line\n\nSecond line $x\neq 0$ and $\nu$`)).toBe("First line\n\nSecond line $x\\neq 0$ and $\\nu$");
  });
  it("renders imported superscripts and plain powers as math", () => {
    expect(normalizeMarkdown("x<sup>12</sup> and 3^2")).toBe("$x^{12}$ and $3^{2}$");
    expect(normalizeMarkdown("$x<sup>12</sup>$")).toBe("$x^{12}$");
    expect(normalizeMarkdown("$x^{18}$ and `x^2` ![x^2](asset://example)")).toBe("$x^{18}$ and `x^2` ![x^2](asset://example)");
    expect(normalizeMarkdown("$\\begin{aligned}\nx^2 &= 4\\\\\ny &= 2\\end{aligned}$")).toBe("$\\begin{aligned}\nx^2 &= 4\\\\\ny &= 2\\end{aligned}$");
  });
  it("handles Unicode, negative and grouped exponents without changing code or fractions", () => {
    expect(normalizeMarkdown("x², 2^(3x+1), x^-2, 10⁻³")).toBe("$x^{2}$, $2^{3x+1}$, $x^{-2}$, $10^{-3}$");
    expect(normalizeMarkdown(String.raw`$\frac{x^2}{2}$ and ` + "`x²`" )).toBe(String.raw`$\frac{x^2}{2}$ and ` + "`x²`");
  });
  it("normalizes alternative math delimiters and corrupted JSON escapes", () => {
    expect(normalizeMarkdown(String.raw`\(x^2\)`)).toBe("$x^2$");
    expect(normalizeMarkdown("$\frac{1}{2}$")).toBe("$\\frac{1}{2}$");
    expect(normalizeMarkdown(String.raw`$\begin{aligned}x &= 2\\\ny &= 3\end{aligned}$`)).toBe("$\\begin{aligned}x &= 2\\\\\ny &= 3\\end{aligned}$");
    expect(normalizeMarkdown(String.raw`$\text{Data set $A$}: 1, 2, 3$`)).toBe("$\\text{Data set A}: 1, 2, 3$");
    expect(normalizeMarkdown("$4.6 billion and $2 million")).toBe("\\$4.6 billion and \\$2 million");
  });
  it("leaves ```desmos blocks untouched so their equations keep their exponents", () => {
    const block = "```desmos\ny=x^2-3\ny=2^x\n```";
    expect(normalizeMarkdown(`Graph it:\n\n${block}`)).toBe(`Graph it:\n\n${block}`);
  });
});

describe("official SAT dates", () => {
  it("offers only confirmed future administrations", () => {
    expect(upcomingSatDates("2026-10-05")).toEqual(["2026-11-07", "2026-12-05", "2027-03-06", "2027-05-01", "2027-06-05"]);
    expect(isSatDate("2026-10-05")).toBe(false);
    expect(isSatDate("2026-11-07")).toBe(true);
    expect(upcomingSatDates("2027-06-06")).toEqual([]);
  });
});
it('normalizes exponent notation inside math, preserving code and correctly grouping the entire power',()=>{
  expect(normalizeMarkdown('$2^(3x+1)+x²+10⁻³$ and `x²`')).toBe('$2^{3x+1}+x^{2}+10^{-3}$ and `x²`');
});

const lead = "|| **Lead levels** ||\n | Safe | Unsafe | Total\n:-|:-:|:-:|:-:\n**Vitamin D** |  | $27$ | \n**Zinc** |  |  | $86$\n\n\nA lab tested supplements.";
it("moves a || title || row above the table and fills the corner cell", () => {
  expect(normalizeMarkdown(lead)).toBe("\n**Lead levels**\n\n|  | Safe | Unsafe | Total |\n| :- | :-: | :-: | :-: |\n| **Vitamin D** |  | $27$ |  |\n| **Zinc** |  |  | $86$ |\n\n\n\nA lab tested supplements.");
});
it("does not read a dash divider as a list", () => {
  expect(normalizeMarkdown("Name | Score\n- | -\nAda | $5$")).toContain("| Name | Score |\n| - | - |\n| Ada | $5$ |");
});
it("keeps a pipe in math inside its cell", () => {
  expect(normalizeMarkdown("a | b\n-|-\n$|x|$ | 2")).toContain("| $\\vert x\\vert $ | 2 |");
});
it("joins a line break inside a table cell", () => {
  expect(normalizeMarkdown("| Percent\\nchange | B |\n|---|---|\n| 1 | 2 |")).toContain("| Percent change | B |");
});
it("drops empty pipe rows outside a table but keeps them inside one", () => {
  expect(normalizeMarkdown("Find the value.\n\n|  |\n|  |")).toBe("Find the value.\n");
  expect(normalizeMarkdown("| a | b |\n|---|---|\n|  |  |\n| 1 | 2 |")).toContain("|  |  |\n| 1 | 2 |");
});
it("leaves absolute values and valid tables alone", () => {
  expect(normalizeMarkdown("If $|x| = 2$ then x is 2.")).toBe("If $|x| = 2$ then x is 2.");
  expect(normalizeMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |")).toContain("| a | b |\n| --- | --- |\n| 1 | 2 |");
});
