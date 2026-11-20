import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  fmt: {},
  lint: {
    plugins: ["typescript", "react"],
    categories: {
      correctness: "error",
    },
    rules: {
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "error",
      "react/react-in-jsx-scope": "off",
      "typescript/no-explicit-any": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
