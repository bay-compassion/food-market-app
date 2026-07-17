import { defineConfig } from 'oxfmt';

export default defineConfig({
	singleQuote: true,
	jsxSingleQuote: false,
	printWidth: 100,
	semi: true,
	sortImports: true,
	ignorePatterns: ['build', 'coverage', 'charts', 'schema.gql'],
});
