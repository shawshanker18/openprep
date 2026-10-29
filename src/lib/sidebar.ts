export const SIDEBAR_KEY = "openprep:sidebar";
/** Inline script run before first paint so a sidebar the student closed never flashes open on the next page. */
export const SIDEBAR_RESTORE = `try{if(localStorage.getItem("${SIDEBAR_KEY}")==="closed")document.documentElement.dataset.sidebar="closed"}catch(e){}`;

/** Tablets only: "sidebar" gives a touch screen the desktop shell; anything else keeps the phone-style bottom bar. The account stores the choice; this key lets the next page paint with it. */
export const TABLET_LAYOUT_KEY = "openprep:tablet-layout";
export const TABLET_LAYOUT_RESTORE = `try{if(localStorage.getItem("${TABLET_LAYOUT_KEY}")==="sidebar"&&matchMedia("(pointer:coarse)").matches)document.documentElement.dataset.tabletLayout="sidebar"}catch(e){}`;
