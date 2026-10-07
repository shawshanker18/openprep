export const SIDEBAR_KEY = "openprep:sidebar";
/** Inline script run before first paint so a sidebar the student closed never flashes open on the next page. */
export const SIDEBAR_RESTORE = `try{if(localStorage.getItem("${SIDEBAR_KEY}")==="closed")document.documentElement.dataset.sidebar="closed"}catch(e){}`;
