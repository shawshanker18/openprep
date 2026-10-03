// The only thing the website can reach: two fire-and-forget messages and a feature flag. No Node, no IPC objects.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openprepDesktop", {
  setLockdown: (on, kind) => ipcRenderer.send("lockdown", on === true, kind === "focus" ? "focus" : "test"),
  setReminder: (hour) => ipcRenderer.send("reminder", Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null),
  googleSignIn: true, // this build finishes Google sign-in coming back from the browser (openprep://auth?google=…)
});
