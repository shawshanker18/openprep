"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { inNativeApp, setLockdown } from "@/lib/native";

/** Apps only: lock the screen to this study session. Unlike a test, the student can end it whenever they like. */
export function FocusToggle() {
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAvailable(inNativeApp()), 0);
    return () => { clearTimeout(t); setLockdown(false, "focus"); };
  }, []);
  if (!available) return null;
  return (
    <Button variant="outline" size="sm" aria-pressed={on} onClick={() => { setLockdown(!on, "focus"); setOn(!on); }}>
      {on ? "Exit focus mode" : "Focus mode"}
    </Button>
  );
}
