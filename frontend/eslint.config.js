import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/**
 * Pronokif frontend — ESLint v9 flat config.
 *
 * Two passes: a JS/JSX pass for the still-unmigrated files (allowJs in
 * tsconfig.json keeps them compiling) and a TS/TSX pass that adds the
 * react-refresh rule. Both share react-hooks rules.
 *
 * Strict TS lint is layered in Sprint 3 when @typescript-eslint becomes
 * worth the install cost (today only main.tsx + vite-env.d.ts are TS).
 */
export default [
  {
    ignores: ["build", "dist", "node_modules", "coverage", "public"],
  },

  // Common rules across JS, JSX, TS, TSX.
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // React 19 -> jsx-runtime, no need to import React in scope.
      "no-undef": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
