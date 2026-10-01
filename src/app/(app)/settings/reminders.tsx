"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inNativeApp, setNativeReminder } from "@/lib/native";
import { setReminderHour, subscribePush, testPush, unsubscribePush } from "./actions";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const control = "h-9 rounded-md border bg-background px-2 text-sm";
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-US", { hour: "numeric" });

function keyBytes(base64: string) {
  const b = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

type State = "loading" | "native" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function Reminders({ hour }: { hour: number | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState<PushSubscription | null>(null);

  useEffect(() => {
    (async () => {
      if (inNativeApp()) return setState("native"); // the app schedules its own daily notification
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const s = await reg.pushManager.getSubscription();
      setSub(s);
      setState(s ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY!) });
      const r = await subscribePush(JSON.parse(JSON.stringify(s)));
      if (!r.ok) { await s.unsubscribe(); toast.error(r.error); return; }
      setSub(s); setState("on");
      toast.success("Reminders are on for this device.");
    } catch { toast.error("Couldn't turn on notifications in this browser."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      if (sub) { await unsubscribePush(sub.endpoint); await sub.unsubscribe(); }
      setSub(null); setState("off");
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try {
      const r = await testPush();
      if (r.ok) toast(r.data.delivered ? `Sent to ${r.data.delivered} device${r.data.delivered === 1 ? "" : "s"}.` : "Nothing was delivered. Try turning reminders off and on again.");
    } finally { setBusy(false); }
  }

  return (
    <section id="reminders" className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="font-medium">Study reminders</h2>
      <p className="text-sm text-muted-foreground">A notification at your study time on days you haven&apos;t practised yet. Turn it on for each device you use.</p>
      <label className="flex flex-col gap-1 text-sm sm:w-60">Remind me at
        <select className={control} value={hour ?? ""} onChange={(e) => {
          const h = e.target.value === "" ? null : Number(e.target.value);
          void setReminderHour(h);
          if (state === "native") void setNativeReminder(h);
        }}>
          <option value="">Off</option>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
      </label>
      {state === "native" && <p className="text-sm text-muted-foreground">This app reminds you on this device at the time above.</p>}
      {state === "loading" && <p className="text-sm text-muted-foreground">Checking this browser…</p>}
      {state === "unsupported" && <p className="text-sm text-muted-foreground">This browser can&apos;t receive notifications.</p>}
      {state === "ios-install" && <p className="text-sm">On iPhone and iPad: tap Share → <b>Add to Home Screen</b>, open OpenPrep from your home screen, then come back here.</p>}
      {state === "denied" && <p className="text-sm">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload.</p>}
      {state === "off" && <Button className="self-start" disabled={busy} onClick={enable}>Turn on for this device</Button>}
      {state === "on" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={test}>Send a test</Button>
          <Button variant="outline" disabled={busy} onClick={disable}>Turn off for this device</Button>
        </div>
      )}
      {state === "on" && hour == null && <p className="text-sm text-muted-foreground">Pick a time above to start getting reminders.</p>}
    </section>
  );
}
