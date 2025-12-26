import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import vue from "eslint-plugin-vue";
import ts from "typescript-eslint";
import vueParser from "vue-eslint-parser";

export default [
	{
		ignores: ["dist/**", "node_modules/**", "*.config.js", "*.config.ts"],
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...vue.configs["flat/recommended"],
	prettier,
	{
		files: ["**/*.vue"],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: ts.parser,
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
	},
	{
		files: ["**/*.{js,ts,vue}"],
		rules: {
			// Vue 规则
			"vue/multi-word-component-names": "off",
			"no-undef": "off",
			"vue/component-name-in-template-casing": ["error", "PascalCase"],
			"vue/block-lang": [
				"error",
				{
					script: { lang: "ts" },
				},
			],
			"vue/component-api-style": ["error", ["script-setup"]],
			"vue/define-macros-order": [
				"error",
				{
					order: ["defineProps", "defineEmits"],
				},
			],
			"vue/html-self-closing": [
				"error",
				{
					html: {
						void: "always",
						normal: "always",
						component: "always",
					},
				},
			],

			// TypeScript 规则
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "warn",

			// 通用规则
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"prefer-const": "error",
			"no-var": "error",
		},
	},
];
