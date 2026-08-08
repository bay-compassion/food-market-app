import { defineConfig } from 'oxfmt';

export default defineConfig({
	singleQuote: true,
	jsxSingleQuote: false,
	printWidth: 100,
	semi: true,
	sortImports: true,
	// `.claude/skills` and `.agents/skills` hold agent skills vendored from upstream repos.
	// They are not ours to reformat — reformatting them would only make future updates conflict.
	ignorePatterns: ['build', 'coverage', 'charts', 'schema.gql', '.claude/skills', '.agents/skills'],
});
