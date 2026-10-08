// The one renderer for all content and AI output. No raw HTML (no rehype-raw) — spec 01 §7.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/contrib/mhchem";
import "katex/dist/katex.min.css"; // only pages that show maths load the maths styles
import { cn } from "@/lib/utils";
import { QuestionImage } from "./question-image";
import { normalizeMarkdown } from "@/lib/normalize-markdown";

/** "Worked example 1 (easy)" → "worked-example-1-easy", so pages can link to a lesson section. */
export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-op min-w-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{img:({src,alt})=><QuestionImage key={typeof src==='string'?src:''} src={typeof src==='string'?src:undefined} alt={alt}/>}}>
        {normalizeMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
