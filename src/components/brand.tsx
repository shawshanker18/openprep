import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * OpenPrep "Next Step" brand pieces (assets in /public/brand, made from the supplied brand pack).
 * The artwork is black and gray on transparent, so on the dark theme (and on dark banners) it is inverted to white.
 * They are static files, so Next's image optimizer is skipped (`unoptimized`): nothing here uses optimizer quota.
 */

type Mark = { height?: number; invert?: boolean; className?: string };
const sized = (height: number) => ({ height, width: "auto" as const });
const tone = (invert?: boolean) => (invert ? "invert" : "dark:invert");

/** The OP symbol alone. */
export function BrandSymbol({ height = 24, invert, className }: Mark) {
  return <Image src="/brand/symbol.webp" alt="" aria-hidden width={360} height={192} unoptimized style={sized(height)} className={cn("shrink-0", tone(invert), className)} />;
}

/** Symbol and wordmark together: the logo for headers and the sidebar. */
export function BrandLogo({ height = 22, invert, className }: Mark) {
  const small = height <= 40; // the half-size file is plenty at header sizes and saves bytes on slow connections
  return <Image src={small ? "/brand/logo-sm.webp" : "/brand/logo.webp"} alt="OpenPrep" width={small ? 480 : 900} height={small ? 82 : 153} unoptimized priority style={sized(height)} className={cn("shrink-0", tone(invert), className)} />;
}

const PLATE = { light: "bg-[url('/brand/stage-light.webp')]", dark: "bg-[url('/brand/stage-dark.webp')]" } as const;

/**
 * The one banner used at the top of hub pages (Home, Learn, Tests): a small label with the symbol, a title, a line of
 * context and room for the page's main button. Desktop windows get the photographic stage behind it; phones, tablets
 * and small windows get a plain text banner and never download the picture (a CSS background on a hidden layer is not fetched).
 */
export function BrandBanner({ eyebrow, title, description, children, tone: look = "light", className }: {
  eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; tone?: "light" | "dark"; className?: string;
}) {
  const dark = look === "dark";
  return (
    <section className={cn("relative isolate overflow-hidden rounded-2xl border", dark && "border-transparent bg-neutral-950 text-white", className)}>
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-20 hidden bg-cover bg-right desk:block", dark ? PLATE.dark : cn(PLATE.light, "dark:bg-[url('/brand/stage-dark.webp')]"))} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 hidden desk:block",
        dark ? "bg-gradient-to-r from-black/75 via-black/35 to-transparent" : "bg-gradient-to-r from-background via-background/85 to-transparent dark:from-black/80 dark:via-black/45")} />
      <div className="relative flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className={cn("mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]", dark ? "text-white/70" : "text-muted-foreground")}>
              <BrandSymbol height={14} invert={dark} />{eyebrow}
            </p>
          )}
          <h1 className="break-words text-2xl font-semibold">{title}</h1>
          {description && <p className={cn("mt-1 max-w-prose text-sm", dark ? "text-white/70" : "text-muted-foreground")}>{description}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </section>
  );
}
