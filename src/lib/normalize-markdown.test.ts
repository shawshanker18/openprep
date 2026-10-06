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
