import { defineConfig, devices } from '@playwright/test';

import { readRigState } from './e2e-queue/rig-state';

export default defineConfig({
	testDir: './e2e-queue',
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	timeout: 240_000,
	expect: { timeout: 30_000 },
	outputDir: 'test-results/queue',
	reporter: [
		['list', { printSteps: true }],
		['html', { outputFolder: 'playwright-report/queue', open: 'never' }],
	],
	use: {
		...devices['Pixel 7'],
		baseURL: readRigState().baseURL,
		actionTimeout: 30_000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
});
