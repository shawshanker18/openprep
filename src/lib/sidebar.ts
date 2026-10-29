export const SIDEBAR_KEY = "openprep:sidebar";
/** Inline script run before first paint so a sidebar the student closed never flashes open on the next page. */
export const SIDEBAR_RESTORE = `try{if(localStorage.getItem("${SIDEBAR_KEY}")==="closed")document.documentElement.dataset.sidebar="closed"}catch(e){}`;

/** Settings can pin the layout per browser: "desktop" (docked sidebar, no tab bar) or "tablet" (menu button and tab bar). Unset: the device decides. */
export const LAYOUT_KEY = "openprep:layout";
export const LAYOUT_RESTORE = `try{var l=localStorage.getItem("${LAYOUT_KEY}");if(l==="desktop"||l==="tablet")document.documentElement.dataset.layout=l}catch(e){}`;
