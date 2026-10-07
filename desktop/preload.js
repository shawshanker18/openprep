// The only thing the website can reach: a reminder message and a feature flag. No Node, no IPC objects.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openprepDesktop", {
  setReminder: (hour) => ipcRenderer.send("reminder", Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null),
  googleSignIn: true, // this build finishes Google sign-in coming back from the browser (openprep://auth?google=…)
});
