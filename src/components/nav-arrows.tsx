"use client";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { mouseButtonDirection } from "@/lib/mouse-nav";

const go = (direction: -1 | 1) => (direction < 0 ? history.back() : history.forward());
const button = "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground";

/** Back and forward arrows, and the mouse's side buttons do the same thing. */
export function NavArrows() {
  useEffect(() => {
    const onMouse = (event: MouseEvent) => {
      const direction = mouseButtonDirection(event.button);
      if (!direction) return;
      event.preventDefault(); // stop the browser from also navigating, so one press moves exactly one page
      if (event.type === "mouseup") go(direction);
    };
    const types = ["mousedown", "mouseup", "auxclick"] as const;
    types.forEach((type) => window.addEventListener(type, onMouse, true));
    return () => types.forEach((type) => window.removeEventListener(type, onMouse, true));
  }, []);
  return (
    <>
      <button type="button" onClick={() => go(-1)} aria-label="Go back" title="Back" className={button}><ArrowLeft className="size-5" /></button>
      <button type="button" onClick={() => go(1)} aria-label="Go forward" title="Forward" className={button}><ArrowRight className="size-5" /></button>
    </>
  );
}
