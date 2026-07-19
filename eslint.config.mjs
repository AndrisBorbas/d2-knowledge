import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from 'eslint-config-prettier/flat'
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    name: "overrides",
    files: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    settings: {
      // eslint-plugin-react's "detect" setting calls context.getFilename(),
      // which ESLint 10 removed; pin the version to skip that code path.
      react: {
        version: "19.2.7",
      },
    },
    rules: {
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "sort-imports": "off",
      "import/order": "off",
    },
  },
  {
    // Scoped to .ts/.tsx to match where eslint-config-next/typescript wires
    // up the typescript-eslint parser; applying these to .mjs/.mts configs
    // and scripts crashes since no type info is available there.
    // eslint-config-next/typescript doesn't enable type-aware parsing on its
    // own, so restrict-template-expressions needs projectService wired up
    // here or it throws instead of linting.
    name: "typescript-overrides",
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
