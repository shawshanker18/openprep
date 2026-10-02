// Deterrent only (see src/components/no-inspect.tsx). A `debugger` statement only pauses while DevTools is open, so
// a long gap means it's open. A plain file because the production minifier strips `debugger` from app code.
(function () {
  if (window.__openprepGuard) return;
  window.__openprepGuard = setInterval(function () {
    var t = performance.now();
    debugger; // eslint-disable-line no-debugger
    if (performance.now() - t > 100) window.dispatchEvent(new Event("openprep:devtools"));
  }, 2000);
})();
