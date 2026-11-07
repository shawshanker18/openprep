const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const TABLE_TITLE = /^\s*\|\|\s*(.*?\S)\s*\|\|\s*$/;
const EMPTY_PIPES = /^\s*\|[\s|]*$/;

/** Split a table line into cells. A pipe inside math is the maths, not a column. */
function tableCells(line: string) {
  const text = line.trim(), out: string[] = [];
  let cell = "", math = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!, escaped = text[i - 1] === "\\";
    if (c === "$" && !escaped) math = !math;
    if (c === "|" && !math && !escaped) { out.push(cell); cell = ""; } else cell += c;
  }
  out.push(cell);
  if (text.startsWith("|")) out.shift();
  if (text.endsWith("|") && out.length) out.pop();
  return out.map((c) => c.trim().replace(/\$[^$]*\$/g, (m) => m.replace(/(?<!\\)\|/g, "\\vert ")));
}
/** Fit a row to the table. A leading pipe with a cell short means the first cell is empty, as in a corner cell. */
function tableRow(line: string, width: number) {
  const cells = tableCells(line);
  if (line.trim().startsWith("|") && cells.length < width) cells.unshift("");
  while (cells.length < width) cells.push("");
  return `| ${cells.join(" | ")} |`;
}

/**
 * Imported tables use a looser format than GFM: a || title || row above the header, a header a cell short, and a
 * "- | - | -" divider that parses as a list. Rewrite those as plain GFM, and drop empty pipe rows left by import.
 */
function repairTables(source: string) {
  const lines = source.split("\n"), out: string[] = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    if (fenced) { out.push(line); continue; }
    const head = out.at(-1);
    if (line.includes("|") && TABLE_DIVIDER.test(line) && head?.includes("|")) {
      out.pop();
      const title = out.at(-1)?.match(TABLE_TITLE)?.[1];
      if (title) { out.pop(); out.push("", title.includes("**") ? title : `**${title}**`); }
      const divider = tableCells(line), width = Math.max(divider.length, tableCells(head).length);
      while (divider.length < width) divider.push("---");
      out.push("", tableRow(head, width), `| ${divider.join(" | ")} |`);
      while (lines[i + 1]?.trim() && lines[i + 1]!.includes("|")) out.push(tableRow(lines[++i]!, width));
      out.push("");
      continue;
    }
    if (!EMPTY_PIPES.test(line) || TABLE_DIVIDER.test(lines[i + 1] ?? "")) out.push(line);
  }
  return out.join("\n");
}

/** Repair imported text before parsing Markdown. Never enable arbitrary source HTML. */
export function normalizeMarkdown(source: string): string {
  return repairTables(source
    .replace(/^\|.*\|[ \t]*$/gm, (row) => row.replace(/\$[^$]*\$|\\n/g, (m) => m === "\\n" ? " " : m)) // A line break in a cell would end the row.
    .replace(/(?<!\\)\$(\d[\d,.]*)(?=\s+(?:billion|million|thousand|dollars)\b)/g, "\\$$$1")
    .replace(/\\{3,}n/g, "\\\\\n") // Overescaped equation row separators followed by a literal newline.
    .replace(/\\n(?![a-z])/g, "\n") // Preserve commands such as \neq, \nu and \nabla.
    .replace(/\\text\{([^{}]*)\}/g, (_, text: string) => `\\text{${text.replace(/(?<!\\)\$([^$]+)(?<!\\)\$/g, "$1")}}`)
    .replace(/\u000c(?=rac)/g, "\\f")
    .replace(/\u0009(?=ext|heta|imes)/g, "\\t")
    .replace(/\u0008(?=egin|eta)/g, "\\b")
    .replace(/<br\s*\/?\s*>/gi, "\n\n")
    .replace(/\$([^$\n]+)\$/g, (_, math: string) => `$${math.replace(/<sup>([-+\w{}().]+)<\/sup>/gi, "^{$1}").replace(/<sub>([\w+-]+)<\/sub>/gi, "_{$1}")}$`)
    .replace(/([a-zA-Z0-9)]+)<sup>([-+\w{}().]+)<\/sup>/gi, (_, base, exponent) => `$${base}^{${exponent}}$`)
    .replace(/<sup>([-+\w{}().]+)<\/sup>/gi, (_, exponent) => `$^{${exponent}}$`)
    .replace(/<sub>([\w+-]+)<\/sub>/gi, (_, subscript) => `$_{${subscript}}$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n\n$$\n${math}\n$$\n\n`)
    .split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|(?<!\\)\$[^$]*?(?<!\\)\$|`[^`]*`|!\[[^\]]*\]\([^)]*\))/g)
    .map((part, index) => index % 2 ? part : part.replace(/\b([a-zA-Z]|\d+(?:\.\d+)?)\^(-?\d+|\{[^{}\n]+\}|\([^()\n]+\))/g, (_, base, power) => `$${base}^{${power.replace(/^[{(]|[})]$/g, "")}}$`))
    .join("")
    .split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|(?<!\\)\$[^$]*?(?<!\\)\$|`[^`]*`|!\[[^\]]*\]\([^)]*\))/g)
    .map((part, index) => index % 2 ? (part.startsWith('$') ? part.replace(/\^\(([^()\n]+)\)/g, '^{$1}').replace(/([a-zA-Z0-9)}\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_, base: string, exponent: string) => {
      const symbols="⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ", plain="0123456789-+n";
      return `${base}^{${[...exponent].map(c=>plain[symbols.indexOf(c)]).join('')}}`;
    }) : part) : part.replace(/([a-zA-Z]|\d+(?:\.\d+)?)([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_, base: string, exponent: string) => {
      const symbols = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ", plain = "0123456789-+n";
      return `$${base}^{${[...exponent].map(c => plain[symbols.indexOf(c)]).join("")}}$`;
    }))
    .join(""));
}
