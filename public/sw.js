// Service worker: push reminders only (no offline caching).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || "OpenPrep", {
    body: data.body || "Time for today's SAT practice.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "openprep-reminder",
    data: { url: data.url || "/dashboard" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  if (url.origin !== self.location.origin) return; // only ever open our own pages
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find((w) => new URL(w.url).origin === url.origin);
    if (win) { await win.focus(); return win.navigate(url.href); }
    return self.clients.openWindow(url.href);
  })());
});
