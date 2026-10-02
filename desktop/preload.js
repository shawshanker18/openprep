// The only thing the website can reach: two fire-and-forget messages. No Node, no IPC objects exposed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openprepDesktop", {
  setLockdown: (on, kind) => ipcRenderer.send("lockdown", on === true, kind === "focus" ? "focus" : "test"),
  setReminder: (hour) => ipcRenderer.send("reminder", Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null),
});
