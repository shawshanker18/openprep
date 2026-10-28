"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunDim, MonitorSmartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SEEN_KEY = "openprep-theme-asked";
/** Order matters: the beige "dull" theme is OpenPrep's own look, so it leads. `bg` and `ink` mirror the real theme colours for the preview. */
const OPTIONS = [
  { value: "dull", label: "OpenPrep classic", hint: "Soft beige, easy on the eyes", icon: SunDim, bg: "oklch(0.925 0.005 85)", card: "oklch(0.95 0.005 85)", ink: "oklch(0.22 0 0)", sprinkles: true },
  { value: "light", label: "Light", hint: "Bright and crisp", icon: Sun, bg: "oklch(1 0 0)", card: "oklch(0.97 0 0)", ink: "oklch(0.145 0 0)" },
  { value: "dark", label: "Dark", hint: "Low light studying", icon: Moon, bg: "oklch(0.205 0 0)", card: "oklch(0.27 0 0)", ink: "oklch(0.95 0 0)" },
  { value: "system", label: "Match my device", hint: "Follows your settings", icon: MonitorSmartphone, bg: "linear-gradient(90deg, oklch(1 0 0) 50%, oklch(0.205 0 0) 50%)", card: "oklch(0.6 0 0 / 0.25)", ink: "oklch(0.5 0 0)" },
] as const;
/** The classic OpenPrep sprinkles: small rounded flecks in warm, muted colours. [left %, top %, rotation, colour] */
const SPRINKLES: [number, number, number, string][] = [
  [10, 42, 20, "#c9715b"], [30, 70, -35, "#7d9a7a"], [52, 12, 70, "#d8a94b"], [70, 62, 10, "#5b7c99"], [88, 20, -50, "#c9715b"],
  [18, 44, 80, "#d8a94b"], [62, 38, -20, "#7d9a7a"], [92, 74, 45, "#d8a94b"], [42, 84, 15, "#c9715b"], [78, 8, 60, "#5b7c99"],
];

/** First visit after signing up: one small question, "light or dark?". Remembered per browser; changeable later in Settings. */
export function ThemePrompt() {
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let asked = true;
    try { asked = !!localStorage.getItem(SEEN_KEY) || !!localStorage.getItem("theme"); } catch { /* storage blocked: skip the question */ }
    if (!asked) { const t = setTimeout(() => setOpen(true), 400); return () => clearTimeout(t); }
  }, []);
  function finish(value?: string) {
    if (value) setTheme(value);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) finish(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How should OpenPrep look?</DialogTitle>
          <DialogDescription>Pick the one that is easier on your eyes. You can change it any time in Settings.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => finish(o.value)}
              className="group flex flex-col gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:border-foreground/50 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2">
              <span aria-hidden className="relative block h-20 overflow-hidden rounded-[5px] border border-black/10" style={{ background: o.bg }}>
                <span className="absolute left-2 top-2 h-2 w-10 rounded-sm" style={{ background: o.ink, opacity: 0.8 }} />
                <span className="absolute bottom-2 left-2 right-2 h-8 rounded-sm" style={{ background: o.card }} />
                {"sprinkles" in o && SPRINKLES.map(([x, y, r, c], i) => <span key={i} className="absolute h-1 w-3 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: c, transform: `rotate(${r}deg)` }} />)}
              </span>
              <span className="flex items-center gap-1.5 px-0.5 font-medium"><o.icon className="size-4" />{o.label}</span>
              <span className="-mt-1.5 px-0.5 text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
