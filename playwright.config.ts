import { defineConfig, devices } from '@playwright/test';

/**
 * Lightweight browser coverage; API-dependent scenarios supply their own responses.
 * The isolated full-stack queue rig uses playwright.queue.config.ts — see e2e/README.md.
 */
export default defineConfig({
	testDir: './e2e',
	outputDir: 'test-results/browser',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	// This is a mobile-first app (see AGENTS.md); the default project emulates a phone.
	projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
});
