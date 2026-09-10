import js from '@eslint/js';
import globals from 'globals';

export default [
	js.configs.recommended,

	{
		ignores: ['eslint.config.mjs', 'lighthouserc.js', 'assets/scripts/altcha.js'],
	},

	{
		files: ['tests/**/*.js'],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'commonjs',
			globals: { ...globals.node },
		},
		rules: {
			'no-undef': 'error',
			'no-unused-vars': 'warn',
			'no-console': 'off',
		},
	},

	{
		ignores: ['eslint.config.mjs', 'lighthouserc.js', 'playwright.config.js'],
	},

	{
		files: ['assets/scripts/**/*.js', 'engine/**/*.js', 'service-worker.js', 'analysis/**/*.js'],
		ignores: ['assets/scripts/epic/epic.js'],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'script',
			globals: { ...globals.browser },
		},
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'no-console': 'off',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-useless-escape': 'error',
			'no-useless-assignment': 'error',
		},
	},

	{
		files: ['assets/scripts/engine/epic/epic.js'],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'module',
			globals: { ...globals.browser },
		},
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'no-console': 'off',
			'no-empty': ['error', { allowEmptyCatch: true }],
		},
	},

	{
		files: ['functions/**/*.js'],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'module',
			globals: {
				...globals.browser,
				URL: 'readonly',
				Response: 'readonly',
				Request: 'readonly',
				fetch: 'readonly',
			},
		},
		rules: {
			'no-undef': 'error',
			'no-unused-vars': 'warn',
			'no-console': 'off',
			'no-empty': ['error', { allowEmptyCatch: true }],
		},
	},
];
