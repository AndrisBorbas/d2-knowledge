// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";

export default defineConfig({
	files: ["**/*.{js,cjs,jsx,ts,cts,mts,tsx}"],
	plugins: {
		"simple-import-sort": simpleImportSort,
	},
	extends: [
		js.configs.recommended,
		tseslint.configs.strictTypeChecked,
		tseslint.configs.stylisticTypeChecked,
		eslintConfigPrettier,
	],
	languageOptions: {
		globals: globals.browser,
		parserOptions: {
			projectService: true,
		},
	},
	rules: {
		"simple-import-sort/imports": "error",
		"simple-import-sort/exports": "error",
		"sort-imports": "off",
		"import/order": "off",

		"@typescript-eslint/restrict-template-expressions": [
			"error",
			{ allowNumber: true },
		],
		"@typescript-eslint/consistent-type-definitions": ["error", "type"],
		"@typescript-eslint/no-unused-vars": "warn",
	},
});
