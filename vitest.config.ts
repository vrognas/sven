import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["test/vitest.mocha-compat.ts"],
    include: [
      "test/unit/**/*.test.ts",
      "test/scripts/**/*.test.ts",
      "test/integration/**/*.test.ts",
      "src/test/**/*.test.ts"
    ],
    exclude: ["node_modules", "out", "dist"],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "test/**", "out/**", "dist/**"]
    }
  },
  resolve: {
    alias: {
      mocha: path.resolve(__dirname, "test/vitest.mocha-shim.ts"),
      vscode: path.resolve(__dirname, "test/__mocks__/vscode.ts")
    }
  }
});
