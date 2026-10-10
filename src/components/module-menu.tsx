"use client";

import { useTransition } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, ChevronRight, LoaderCircle } from "lucide-react";
import { startTestAction } from "@/app/(app)/tests/actions";
import { MODULE_ROUTES, MODULE_SECTIONS } from "@/lib/test-modules";

const popup = "z-50 min-w-44 rounded-xl bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none";
const item = "flex cursor-default items-center justify-between gap-6 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-muted";

/** "Individual modules" flyout: hover a section, then pick Module 1, 2 (Easy) or 2 (Hard). `last` maps "section:route" to a short last-result label. */
export function ModuleMenu({ paper, last }: { paper: number; last: Record<string, string> }) {
  const [pending, start] = useTransition();
  const go = (scope: string) => {
    const form = new FormData();
    form.set("scope", scope);
    form.set("paper", String(paper));
    start(() => startTestAction(form));
  };
  return (
    <Menu.Root>
      <Menu.Trigger openOnHover delay={80} disabled={pending} className="flex h-9 w-full items-center justify-between rounded-lg border bg-background px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
        Individual modules
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Menu.Popup className={popup}>
            {MODULE_SECTIONS.map((s) => (
              <Menu.SubmenuRoot key={s.id}>
                <Menu.SubmenuTrigger openOnHover delay={60} className={`${item} data-popup-open:bg-muted`}>
                  {s.name}<ChevronRight className="size-4 text-muted-foreground" />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner side="right" align="start" sideOffset={6} alignOffset={-6} className="z-50">
                    <Menu.Popup className={popup}>
                      {MODULE_ROUTES.map((m) => (
                        <Menu.Item key={m.route} className={item} onClick={() => go(`${s.id}:${m.route}`)}>
                          {m.label}
                          <span className="text-xs text-muted-foreground tabular-nums">{last[`${s.id}:${m.route}`] ?? ""}</span>
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
