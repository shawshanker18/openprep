// The one renderer for all content and AI output. No raw HTML (no rehype-raw) — spec 01 §7.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/** "Worked example 1 (easy)" → "worked-example-1-easy", so pages can link to a lesson section. */
export const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-op", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
