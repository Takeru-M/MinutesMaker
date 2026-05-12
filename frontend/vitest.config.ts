import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      redux: path.resolve(__dirname, "./lib/shims/redux.ts"),
      "react-redux": path.resolve(__dirname, "./lib/shims/react-redux.tsx"),
    },
  },
});
