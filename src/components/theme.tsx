"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Choice } from "@/components/ui/choice";

/** Light (default) / Dark / System, stored per browser (no account data). Adds the `dark` class that globals.css styles. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemes attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>{children}</NextThemes>;
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []); // theme is only known on the client
  return (
    <label className="flex flex-col gap-1 text-sm">Theme
      <Choice className="w-48" value={mounted ? (theme ?? "light") : "light"} onValueChange={setTheme} disabled={!mounted}
        options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Match my device" }]} />
    </label>
  );
}
