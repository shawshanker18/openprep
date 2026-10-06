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
    .map((part, index) => index % 2 ? part : part.replace(/\b([a-zA-Z]|\d+(?:\.\d+)?)\^(-?\d+|\{[^{}\n]+\})/g, (_, base, power) => `$${base}^{${power.replace(/[{}]/g, "")}}$`))
    .join("");
}
