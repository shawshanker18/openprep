// Practice sessions all live at /practice, so these links carry what the path can't: that a session belongs to the
// question bank, and where a finished remix goes back to.
type Linked = { id: string; back?: string | null };

export const inBank = (back?: string | null) => !!back && (back.startsWith("/question-bank") || back.includes("in=bank"));
export const sessionHref = (s: Linked) => `/practice?session=${s.id}${inBank(s.back) ? "&in=bank" : ""}`;

/** A remix session goes back into the session it came from, not to a list page. */
export const returnsToSession = (back?: string | null) => !!back?.startsWith("/practice?session=");

/** The question after the one remixed. A remix of a remix keeps the first remix's way back. */
export function remixReturn(parent: Linked, position: number) {
  return returnsToSession(parent.back) ? parent.back! : `${sessionHref(parent)}&next=${position}`;
}

/** Open a session on the question after `next`. Before the cursor that question already exists, so jump to it. */
export const startAfter = (cursor: number, next: number) =>
  next === cursor ? { kind: "next" as const, position: next } : next < cursor ? { kind: "jump" as const, position: next + 1 } : undefined;

export function backLabel(back: string) {
  if (returnsToSession(back)) return inBank(back) ? "Back to the question bank" : "Back to your session";
  return back.startsWith("/question-bank") ? "Back to the question bank" : back.startsWith("/bookmarks") ? "Back to saved questions" : back.startsWith("/analysis") ? "Back to analysis" : "Back to the course";
}
