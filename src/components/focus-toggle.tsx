"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { setLockdown } from "@/lib/native";

/** Desktop app only: lock the screen to this study session (same kiosk lockdown as tests). */
export function FocusToggle() {
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAvailable(!!window.openprepDesktop), 0);
    return () => { clearTimeout(t); setLockdown(false); };
  }, []);
  if (!available) return null;
  return (
    <Button variant="outline" size="sm" aria-pressed={on} onClick={() => { setLockdown(!on); setOn(!on); }}>
      {on ? "Exit focus mode" : "Focus mode"}
    </Button>
  );
}
