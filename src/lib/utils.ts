export { cn } from "cn"

/**
 * Is this key press typing into something (a text box, the Desmos calculator's hidden textarea, a dialog)? Page
 * shortcuts like A–D must ignore it, or using the calculator would change the answer.
 */
export const isTyping = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && (e.target.isContentEditable || !!e.target.closest("input, textarea, select, [role=dialog]"))
