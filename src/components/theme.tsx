"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** Light / Dark / System, stored per browser (no account data). Adds the `dark` class that globals.css styles. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemes>;
}

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []); // theme is only known on the client
  return (
    <label className="flex flex-col gap-1 text-sm">Theme
      <select value={mounted ? theme : "system"} onChange={(e) => setTheme(e.target.value)} disabled={!mounted}
        className="h-9 w-48 rounded-md border bg-background px-2 text-sm">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
