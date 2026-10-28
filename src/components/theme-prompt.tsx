"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunDim, MonitorSmartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SEEN_KEY = "openprep-theme-asked";
const OPTIONS = [
  { value: "light", label: "Light", icon: Sun, bg: "oklch(1 0 0)", ink: "oklch(0.145 0 0)" },
  { value: "dull", label: "Dull light (softer white)", icon: SunDim, bg: "oklch(0.925 0.005 85)", ink: "oklch(0.22 0 0)" },
  { value: "dark", label: "Dark", icon: Moon, bg: "oklch(0.205 0 0)", ink: "oklch(0.95 0 0)" },
  { value: "system", label: "Match my device", icon: MonitorSmartphone, bg: "oklch(1 0 0)", ink: "oklch(0.205 0 0)" },
] as const;

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
      <DialogContent className="font-sans sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>How should OpenPrep look?</DialogTitle>
          <DialogDescription>Pick the one that is easier on your eyes. You can change it any time in Settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {OPTIONS.map(({ value, label, icon: Icon, bg, ink }) => (
            <button key={value} type="button" onClick={() => finish(value)}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-sans text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
              <Icon className="size-5 shrink-0" /><span className="flex-1">{label}</span>
              <span aria-hidden className="relative size-7 shrink-0 overflow-hidden rounded-md border border-black/15" style={{ background: bg }}>
                {value === "system" && <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: "oklch(0.205 0 0)" }} />}
                <span className="absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-full" style={{ background: value === "system" ? "oklch(0.5 0 0)" : ink }} />
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
