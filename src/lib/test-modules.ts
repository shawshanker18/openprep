import type { Route } from "@/engine/assemble";

export const MODULE_SECTIONS = [{ id: "rw", name: "Reading & Writing" }, { id: "math", name: "Math" }] as const;
export const MODULE_ROUTES: { route: Route; label: string }[] = [{ route: "base", label: "Module 1" }, { route: "easy", label: "Module 2 (Easy)" }, { route: "hard", label: "Module 2 (Hard)" }];
