import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "src/lib/empty.ts") } },
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"], hookTimeout: 60_000, testTimeout: 30_000 },
});
