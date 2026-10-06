/** Repair imported text before parsing Markdown. Never enable arbitrary source HTML. */
export function normalizeMarkdown(source: string): string {
  return source
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
    .split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$[^$]*?(?<!\\)\$|`[^`]*`|!\[[^\]]*\]\([^)]*\))/g)
    .map((part, index) => index % 2 ? part : part.replace(/\b([a-zA-Z]|\d+(?:\.\d+)?)\^(-?\d+|\{[^{}\n]+\}|\([^()\n]+\))/g, (_, base, power) => `$${base}^{${power.replace(/^[{(]|[})]$/g, "")}}$`))
    .join("")
    .split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$[^$]*?(?<!\\)\$|`[^`]*`|!\[[^\]]*\]\([^)]*\))/g)
    .map((part, index) => index % 2 ? (part.startsWith('$') ? part.replace(/\^\(([^()\n]+)\)/g, '^{$1}').replace(/([a-zA-Z0-9)}\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_, base: string, exponent: string) => {
      const symbols="⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ", plain="0123456789-+n";
      return `${base}^{${[...exponent].map(c=>plain[symbols.indexOf(c)]).join('')}}`;
    }) : part) : part.replace(/([a-zA-Z]|\d+(?:\.\d+)?)([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_, base: string, exponent: string) => {
      const symbols = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ", plain = "0123456789-+n";
      return `$${base}^{${[...exponent].map(c => plain[symbols.indexOf(c)]).join("")}}$`;
    }))
    .join("");
}
