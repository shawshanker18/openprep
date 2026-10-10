const KIND: Record<string, string> = { full: "Full practice test", section: "Section test", module: "Single module", mini: "Mini test", weakness: "Weakness test", custom: "Custom test", diagnostic: "Diagnostic" };

/** Name of a test session: its own title (custom tests, single modules), "Practice Test N · …" for the fixed papers, else its kind. */
export function testLabel(kind: string, config: unknown) {
  const c = (config ?? {}) as { title?: string; paper?: number; sections?: string[] };
  if (c.title) return c.title;
  if (c.paper) return `Practice Test ${c.paper} · ${kind === "full" ? "Full test" : `${c.sections?.[0] === "math" ? "Math" : "Reading and Writing"} section`}`;
  return KIND[kind] ?? kind;
}
