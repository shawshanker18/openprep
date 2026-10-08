"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunDim, MonitorSmartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SEEN_KEY = "openprep-theme-asked";
const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dull", label: "Dull light (softer white)", icon: SunDim },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match my device", icon: MonitorSmartphone },
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>How should OpenPrep look?</DialogTitle>
          <DialogDescription>Pick the one that is easier on your eyes. You can change it any time in Settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => finish(value)}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
              <Icon className="size-5" />{label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
