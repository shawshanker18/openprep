// The only thing the website can reach: two fire-and-forget messages. No Node, no IPC objects exposed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openprepDesktop", {
  setLockdown: (on) => ipcRenderer.send("lockdown", on === true),
  setReminder: (hour) => ipcRenderer.send("reminder", Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null),
});
