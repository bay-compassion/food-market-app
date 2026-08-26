import { defineConfig } from 'oxlint';

export default defineConfig({
	options: {
		typeAware: true,
		typeCheck: true,
	},
	// Matches the same exclusion in oxfmt.config.ts. Agent skills are vendored from upstream
	// repos, so any script one ships is not ours to lint. Today's skills are Markdown only, which
	// oxlint ignores anyway — this is here so a skill that ships a .ts helper cannot break CI.
	ignorePatterns: ['.claude/skills', '.agents/skills'],
	categories: {
		correctness: 'warn',
	},
	jsPlugins: ['@stylistic/eslint-plugin'],
	rules: {
		'eslint/no-unused-vars': 'error',
		'@stylistic/block-spacing': 'error',
		'@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
		'@stylistic/padding-line-between-statements': [
			'error',
			{ blankLine: 'always', prev: '*', next: 'return' },
			{ blankLine: 'always', prev: '*', next: 'block-like' },
			{ blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
			{ blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
		],
		curly: 'error',
	},
});
