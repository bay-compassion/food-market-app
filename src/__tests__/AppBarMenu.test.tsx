import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppBarMenu } from '../components/ui/app-bar/AppBarMenu';
import { StorageKey } from '../services/storage.service';
import { renderWithApp } from './render-with-app';

const deviceId = 'test-device-token'.padEnd(32, 'x');

beforeEach(() => {
	window.localStorage.clear();
});

describe('AppBarMenu', () => {
	it('does not offer a device ID before a device has one', async () => {
		// Arrange
		const user = userEvent.setup();

		renderWithApp(<AppBarMenu />);

		// Act
		await user.click(screen.getByRole('button', { name: 'Open menu' }));

		// Assert
		expect(screen.queryByRole('menuitem', { name: 'Show Device ID' })).toBeNull();
	});

	describe('with an identified device', () => {
		beforeEach(() => {
			window.localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify(deviceId));
		});

		it('shows and copies the device ID', async () => {
			// Arrange
			const user = userEvent.setup();

			renderWithApp(<AppBarMenu />);

			// Act
			await user.click(screen.getByRole('button', { name: 'Open menu' }));
			await user.click(screen.getByRole('menuitem', { name: 'Show Device ID' }));

			// Assert
			expect(screen.getByRole('heading', { name: 'Device ID' })).toBeTruthy();
			expect(screen.getByText(deviceId)).toBeTruthy();

			await user.click(screen.getByRole('button', { name: 'Copy' }));
			expect(await navigator.clipboard.readText()).toBe(deviceId);
			expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
		});
	});
});
