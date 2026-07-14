import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@market-architect/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@market-architect/market-data": path.resolve(__dirname, "packages/market-data/src/index.ts"),
      "@market-architect/engine": path.resolve(__dirname, "packages/engine/src/index.ts")
    }
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] }
});
