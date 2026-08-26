import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against `npm run dev` (Vite only, no Netlify Functions, database, or
 * Auth0), so they're limited to guest-facing behavior that works without a backend — see
 * `e2e/README.md`. Run with `npm run test:e2e`, after `npx playwright install chromium` once.
 */
export default defineConfig({
	testDir: './e2e',
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
