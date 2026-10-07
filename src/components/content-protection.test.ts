import { expect, it } from "vitest";
import { allowsContextMenu, isDevToolsShortcut } from "./content-protection";

const key = (key: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "shiftKey" | "altKey", boolean>> = {}) =>
  ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods });

it("blocks F12 and the inspector, console, element-picker and view-source shortcuts", () => {
  expect(isDevToolsShortcut(key("F12"))).toBe(true);
  for (const k of ["I", "J", "C", "K"]) expect(isDevToolsShortcut(key(k, { ctrlKey: true, shiftKey: true }))).toBe(true);
  expect(isDevToolsShortcut(key("u", { ctrlKey: true }))).toBe(true);
  for (const k of ["i", "j", "c", "u"]) expect(isDevToolsShortcut(key(k, { metaKey: true, altKey: true }))).toBe(true);
  expect(isDevToolsShortcut(key("I", { metaKey: true, shiftKey: true }))).toBe(true);
});

it("leaves normal typing and everyday shortcuts alone", () => {
  for (const k of ["a", "c", "v", "x", "f", "Enter", "F5", "F11"]) expect(isDevToolsShortcut(key(k))).toBe(false);
  expect(isDevToolsShortcut(key("c", { ctrlKey: true }))).toBe(false); // plain copy
  expect(isDevToolsShortcut(key("i", { ctrlKey: true }))).toBe(false);
  expect(isDevToolsShortcut(key("u", { ctrlKey: true, shiftKey: true }))).toBe(false);
});

it("keeps the context menu only inside text fields", () => {
  expect(allowsContextMenu({ tagName: "INPUT" })).toBe(true);
  expect(allowsContextMenu({ tagName: "TEXTAREA" })).toBe(true);
  expect(allowsContextMenu({ tagName: "DIV", isContentEditable: true })).toBe(true);
  expect(allowsContextMenu({ tagName: "P" })).toBe(false);
  expect(allowsContextMenu({ tagName: "IMG" })).toBe(false);
  expect(allowsContextMenu(null)).toBe(false);
});
