/** Repair presentation from the archive without changing question numbers or wording. */
export function normalizeQuestionMarkdown(md:string) {
  return md
    .replace(/^\$(?!\$)([^\n]+?)(?<!\$)\$$/gm,(_,body:string)=>`$${body.replace(/\$\$/g,'$ $')}$`)
    .replace(/\$\\\$([^$]+)\$/g,(_,amount:string)=>`\\$${amount}`)
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,(_,body:string)=>{
      const rows=body.replace(/(?<!\\)\\(?=\s+[a-zA-Z0-9&+-])/g,'\\\\');
      return `\\begin{aligned}${rows}\\end{aligned}`;
    })
    .replace(/\[Show calculator\]\(\/r\/dsat_desmos_calculator\)/gi,'')
    .replace(/\n{4,}/g,'\n\n').trim();
}
