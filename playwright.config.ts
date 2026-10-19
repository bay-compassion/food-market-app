import { defineConfig, devices } from '@playwright/test';

/**
 * Lightweight browser coverage; API-dependent scenarios supply their own responses.
 * The isolated full-stack queue rig uses playwright.queue.config.ts — see e2e/README.md, which also
 * explains the `@small` / `@medium` / `@large` size tags.
 */
export default defineConfig({
	testDir: './e2e',
	outputDir: 'test-results/browser',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// CI annotates failures on the PR and keeps an HTML report for the uploaded artifact.
	reporter: process.env.CI
		? [['github'], ['list'], ['html', { outputFolder: 'playwright-report/browser', open: 'never' }]]
		: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	// This is a mobile-first app (see AGENTS.md); the default project emulates a phone.
	projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
	webServer: {
		// The binary itself, not `pnpm run dev`: pnpm starts a script in a process group of its own,
		// so Playwright's shutdown, which signals the group it started, would leave Vite running.
		command: 'node_modules/.bin/vite',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
});
