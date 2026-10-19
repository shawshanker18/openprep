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
import { DesmosInline } from "./desmos-panel";


export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-op min-w-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
        img:({src,alt})=><QuestionImage key={typeof src==='string'?src:''} src={typeof src==='string'?src:undefined} alt={alt}/>,
        // A ```desmos block in lesson text becomes a graph of its equations (one per line).
        pre({ node, children }) {
          const code = node?.children[0];
          if (code?.type === "element" && String(code.properties.className ?? "").includes("language-desmos")) {
            const text = code.children.map((c) => (c.type === "text" ? c.value : "")).join("");
            // ```desmos-open shows the graph straight away; ```desmos waits for the student to click.
            const open = String(code.properties.className ?? "").includes("language-desmos-open");
            return <DesmosInline expressions={text.split("\n").map((line) => line.trim()).filter(Boolean)} defaultOpen={open} />;
          }
          return <pre>{children}</pre>;
        },
      }}>
        {normalizeMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
