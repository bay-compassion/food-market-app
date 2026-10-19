#!/usr/bin/env node

/**
 * Captures the public evidence for Twilio's A2P 10DLC campaign review from the real application
 * UI. The browser uses a fictional, local-only identity and mocked notification endpoints, so the
 * script never creates a guest or SMS subscription in production (or in a local database).
 *
 * Usage:
 *   pnpm run capture:twilio
 */

import { mkdir } from 'node:fs/promises';

import { chromium, type Page } from 'playwright';

import { AppServer } from './screenshots/app-server.mjs';

const baseUrl = 'http://127.0.0.1:4173';
const outputDirectory = new URL('../public/sms-consent/', import.meta.url);

const storageKeys = {
	deviceToken: 'bay-compassion.guest-device-token',
	identity: 'bay-compassion.guest-identity',
	locale: 'bay-compassion.locale',
	returningVisitor: 'bay-compassion.returning-visitor',
	tourSeen: 'bay-compassion.guest-tour-seen',
} as const;

const fictionalIdentity = {
	firstName: 'Sample',
	lastName: 'Guest',
	phone: '(555) 555-0142',
};

async function mockApplicationApi(page: Page) {
	await page.route('**/api/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;

		switch (path) {
			case '/api/market':
				await route.fulfill({
					json: { event: null, questions: [], counts: {} },
				});

				return;
			case '/api/push-subscription':
				await route.fulfill({ json: { configured: false, publicKey: null } });

				return;
			case '/api/sms-subscription':
				await route.fulfill({ json: { configured: true } });

				return;
			case '/api/notification-status':
				await route.fulfill({
					json: { pushSubscribed: false, smsConsented: false },
				});

				return;
			default:
				await route.fulfill({ status: 404, json: { error: 'Not available in screenshot mode.' } });
		}
	});
}

async function newMobileContext(options: { identified?: boolean } = {}) {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 1,
		isMobile: true,
		hasTouch: true,
		colorScheme: 'light',
		locale: 'en-US',
	});

	await context.addInitScript(
		({ identified, identity, keys }) => {
			localStorage.setItem(keys.locale, JSON.stringify('en'));
			localStorage.setItem(keys.returningVisitor, JSON.stringify(true));
			localStorage.setItem(keys.tourSeen, JSON.stringify(true));

			if (identified) {
				localStorage.setItem(keys.deviceToken, JSON.stringify('screenshot-device-token'));
				localStorage.setItem(keys.identity, JSON.stringify(identity));
			}
		},
		{ identified: options.identified ?? false, identity: fictionalIdentity, keys: storageKeys },
	);

	return context;
}

async function screenshot(page: Page, filename: string, fullPage = false) {
	await page.screenshot({
		path: new URL(filename, outputDirectory).pathname,
		fullPage,
		animations: 'disabled',
	});
}

async function capturePreregistration() {
	await using context = await newMobileContext();
	const page = await context.newPage();

	await mockApplicationApi(page);
	await page.goto(`${baseUrl}/signup`);
	await page.getByRole('heading', { name: 'Save your information for next time' }).waitFor();
	const legalLinks = [
		page.getByRole('link', { name: 'Privacy Policy' }),
		page.getByRole('link', { name: 'Terms & Conditions' }),
	];

	for (const link of legalLinks) {
		await link.waitFor();
	}

	// Capture the entire current form so the legal links remain part of the evidence.
	await screenshot(page, '01-preregistration.png', true);
}

async function captureConsentFlow() {
	await using context = await newMobileContext({ identified: true });
	const page = await context.newPage();

	await mockApplicationApi(page);
	await page.goto(baseUrl);

	const entryPoint = page.getByRole('button', { name: 'Text Me About Updates' });

	await entryPoint.waitFor();
	await screenshot(page, '02-notification-entry-point.png');
	await entryPoint.click();

	const dialog = page.getByRole('dialog', { name: 'Text Message Updates' });
	const consent = dialog.getByRole('checkbox');
	const approve = dialog.getByRole('button', { name: 'Enable text updates' });

	await dialog.waitFor();

	if (await consent.isChecked()) {
		throw new Error('The SMS consent checkbox must be unchecked when the dialog opens.');
	}

	if (await approve.isEnabled()) {
		throw new Error('The SMS opt-in action must be disabled until consent is checked.');
	}

	await screenshot(page, '03-consent-unchecked.png');

	await consent.check();

	if (!(await approve.isEnabled())) {
		throw new Error('The SMS opt-in action should become enabled after affirmative consent.');
	}

	await screenshot(page, '04-consent-checked.png');

	await approve.click();
	await page.getByText('Notifications Enabled').waitFor();
	await screenshot(page, '05-notifications-enabled.png');
}

const server = await AppServer.start(4173);
const browser = await chromium.launch();

try {
	await mkdir(outputDirectory, { recursive: true });
	await capturePreregistration();
	await captureConsentFlow();
	console.log(`Captured Twilio opt-in screenshots in ${outputDirectory.pathname}`);
} finally {
	await browser.close();
	await server[Symbol.asyncDispose]();
}
