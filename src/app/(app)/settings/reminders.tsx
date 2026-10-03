"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { inNativeApp, nativeNotificationsAllowed, setNativeReminder } from "@/lib/native";
import { setReminderHour, subscribePush, testPush, unsubscribePush } from "./actions";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-US", { hour: "numeric" });

function keyBytes(base64: string) {
  const b = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

type State = "loading" | "native" | "native-blocked" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function Reminders({ hour }: { hour: number | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState<PushSubscription | null>(null);

  useEffect(() => {
    (async () => {
      // The app schedules its own daily notification (if the phone lets it show notifications).
      if (inNativeApp()) return setState(hour != null && !(await nativeNotificationsAllowed()) ? "native-blocked" : "native");
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const s = await reg.pushManager.getSubscription();
      setSub(s);
      setState(s ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [hour]);

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
      <p className="text-sm text-muted-foreground">A notification at your study time on days you haven&apos;t practiced yet. Turn it on for each device you use.</p>
      <label className="flex flex-col gap-1 text-sm sm:w-60">Remind me at
        <Choice className="sm:w-60" value={hour == null ? "off" : String(hour)}
          options={[{ value: "off", label: "Off" }, ...Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) }))]}
          onValueChange={(v) => {
            const h = v === "off" ? null : Number(v);
            setReminderHour(h).catch(() => toast.error("Couldn't save your reminder time. Check your connection and try again."));
            if (state === "native" || state === "native-blocked") {
              void setNativeReminder(h).then(async () => setState(h != null && !(await nativeNotificationsAllowed()) ? "native-blocked" : "native"));
            }
          }} />
      </label>
      {state === "native" && (
        <p className="text-sm text-muted-foreground">
          {hour == null ? "Pick a time above to get a daily reminder on this device." : "This app reminds you on this device every day at the time above."}
        </p>
      )}
      {state === "native-blocked" && (
        <p role="alert" className="text-sm">Notifications are off for OpenPrep, so reminders can&apos;t show. Turn them on in your phone&apos;s <b>Settings → Apps → OpenPrep → Notifications</b>, then pick the time again.</p>
      )}
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
