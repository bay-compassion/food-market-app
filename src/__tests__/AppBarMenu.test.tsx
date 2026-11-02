import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { AppBarMenu } from '../components/ui/app-bar/AppBarMenu';
import { translations } from '../locales';
import { StorageKey } from '../services/storage.service';
import { renderWithApp } from './render-with-app';

const deviceToken = 'test-device-token'.padEnd(32, 'x');

beforeEach(() => {
	window.localStorage.clear();
});

describe('AppBarMenu', () => {
	it('shows the install ID before a guest has registered on the device', async () => {
		// Arrange
		const user = userEvent.setup();
		const { store } = renderWithApp(<AppBarMenu />);

		// Act
		await user.click(screen.getByRole('button', { name: 'Open menu' }));
		await user.click(screen.getByRole('menuitem', { name: 'Device details' }));

		// Assert
		expect(screen.getByRole('heading', { name: 'Device details' })).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Device ID' }).textContent).toContain(
			store.guest.installId,
		);
		expect(screen.queryByRole('region', { name: 'Guest token' })).toBeNull();
	});

	describe('with an identified device', () => {
		beforeEach(() => {
			window.localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify(deviceToken));
		});

		it('shows and copies both the install ID and the device token', async () => {
			// Arrange
			const user = userEvent.setup();
			const { store } = renderWithApp(<AppBarMenu />);

			// Act
			await user.click(screen.getByRole('button', { name: 'Open menu' }));
			await user.click(screen.getByRole('menuitem', { name: 'Device details' }));

			// Assert
			expect(screen.getByRole('region', { name: 'Guest token' }).textContent).toContain(
				deviceToken,
			);

			await user.click(screen.getByRole('button', { name: 'Copy device ID' }));
			expect(await navigator.clipboard.readText()).toBe(store.guest.installId);
			expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();

			await user.click(screen.getByRole('button', { name: 'Copy guest token' }));
			expect(await navigator.clipboard.readText()).toBe(deviceToken);
			expect(screen.getAllByRole('button', { name: 'Copied' })).toHaveLength(2);
		});
	});

	it('keeps the guest’s introductions and adds the legal links for a guest', async () => {
		// Arrange
		const user = userEvent.setup();

		renderWithApp(<AppBarMenu />, { route: '/help' });

		// Act
		await user.click(screen.getByRole('button', { name: 'Open menu' }));

		// Assert
		expect(screen.getByRole('menuitem', { name: translations.en.help.title })).toBeTruthy();
		expect(screen.getByRole('menuitem', { name: translations.en.privacyPolicy })).toBeTruthy();
		expect(screen.getByRole('menuitem', { name: translations.en.termsAndConditions })).toBeTruthy();
		expect(screen.getByRole('menuitem', { name: translations.en.appBar.staffLogin })).toBeTruthy();
		expect(
			screen.queryByRole('menuitem', { name: adminTranslations.en.backToGuestView }),
		).toBeNull();
	});

	it('offers the legal links and a way back to the guest view in the dashboard', async () => {
		// Arrange
		const user = userEvent.setup();
		const { currentPath } = renderWithApp(<AppBarMenu />, {
			route: '/admin/queue',
			routes: [{ path: '/', element: <p>Guest view</p> }],
			flags: { 'guest-tour': true },
		});

		// Act
		await user.click(screen.getByRole('button', { name: 'Open menu' }));

		// Assert
		expect(screen.getByRole('menuitem', { name: translations.en.privacyPolicy })).toBeTruthy();
		expect(screen.getByRole('menuitem', { name: translations.en.termsAndConditions })).toBeTruthy();
		expect(screen.queryByRole('menuitem', { name: translations.en.help.title })).toBeNull();
		expect(screen.queryByRole('menuitem', { name: translations.en.appBar.takeTour })).toBeNull();
		expect(screen.queryByRole('menuitem', { name: translations.en.appBar.staffLogin })).toBeNull();

		await user.click(screen.getByRole('menuitem', { name: adminTranslations.en.backToGuestView }));
		expect(currentPath()).toBe('/');
	});
});
