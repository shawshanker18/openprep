"use client";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Choice } from "@/components/ui/choice";
import { TABLET_LAYOUT_KEY } from "@/lib/sidebar";
import { setTabletLayout } from "@/app/(app)/settings/actions";

/** Put the account's tablet layout on this page and in this browser, but only on a touch device: computers always have the sidebar. */
export function applyTabletLayout(value: string) {
  try { if (value === "sidebar") localStorage.setItem(TABLET_LAYOUT_KEY, "sidebar"); else localStorage.removeItem(TABLET_LAYOUT_KEY); } catch { /* storage blocked */ }
  if (value === "sidebar" && matchMedia("(pointer: coarse)").matches) document.documentElement.dataset.tabletLayout = "sidebar";
  else delete document.documentElement.dataset.tabletLayout;
}

/** Tablet layout, saved on the account. Only offered once the account has been opened on a phone or tablet. */
export function TabletLayoutSelect({ value: initial, touchSeen }: { value: "tabs" | "sidebar"; touchSeen: boolean }) {
  const [value, setValue] = useState<string>(initial);
  const coarse = useSyncExternalStore(() => () => {}, () => matchMedia("(pointer: coarse)").matches, () => false);
  if (!touchSeen && !coarse) return null;
  async function change(next: string) {
    const before = value;
    setValue(next); applyTabletLayout(next);
    try {
      const res = await setTabletLayout(next);
      if (!res.ok) throw new Error("rejected");
    } catch { setValue(before); applyTabletLayout(before); toast.error("Couldn't save the layout. Try again."); }
  }
  return (
    <label className="flex flex-col gap-1 text-sm">Layout on tablets
      <Choice className="w-72 max-w-full" value={value} onValueChange={change}
        options={[{ value: "tabs", label: "Bottom bar, sidebar hidden" }, { value: "sidebar", label: "Sidebar, like a computer" }]} />
      <span className="text-xs text-muted-foreground">Phones always use the bottom bar and computers always use the sidebar.</span>
    </label>
  );
}
