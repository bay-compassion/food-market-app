import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppBarMenu } from '../components/ui/app-bar/AppBarMenu';
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
});
