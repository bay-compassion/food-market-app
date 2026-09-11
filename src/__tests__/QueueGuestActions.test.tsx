import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { QueueGuestActions } from '../components/admin/QueueGuestActions';
import type { AdminApi, QueueGuest } from '../services/admin-api';
import type { Permission } from '../services/permissions';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

const t = adminTranslations.en;

const guest: QueueGuest = {
	id: 'visit-1',
	guestId: 'guest-1',
	firstName: 'Hal',
	lastName: 'Reyes',
	phone: '(510) 555-0142',
	householdSize: 2,
	locale: 'en',
	queuePosition: 3,
	calledAt: null,
	status: 'waiting',
};

async function renderActions(permissions: Permission[]) {
	const createGuestClaim = vi.fn().mockResolvedValue({
		token: 'claim-token',
		expiresAt: '2026-09-12T17:15:00.000Z',
		replacesDevice: true,
	});
	const store = new RootStore({
		admin: {
			api: { createGuestClaim } as unknown as AdminApi,
			readPermissions: () => Promise.resolve(permissions),
		},
	});

	vi.spyOn(store.session, 'getStatus').mockResolvedValue();
	await store.admin.load();
	render(
		<RootStoreProvider store={store}>
			<QueueGuestActions guest={guest} menuOnly onRun={vi.fn()} />
		</RootStoreProvider>,
	);
	await userEvent.click(screen.getByRole('button', { name: `${t.moreActions}: Hal Reyes` }));

	return { store, createGuestClaim };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('QueueGuestActions phone code', () => {
	it('is not offered to a worker without manage:guest-access', async () => {
		// Act
		await renderActions(['run:queue']);

		// Assert
		expect(screen.queryByRole('menuitem', { name: t.guestClaimShow })).toBeNull();
	});

	it('asks a manager to confirm who they are speaking to, naming the phone on file', async () => {
		// Arrange
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { createGuestClaim } = await renderActions(['run:queue', 'manage:guest-access']);

		// Act
		await userEvent.click(screen.getByRole('menuitem', { name: t.guestClaimShow }));

		// Assert
		expect(confirm).toHaveBeenCalledOnce();
		expect(confirm.mock.calls[0]?.[0]).toContain('(510) 555-0142');
		expect(confirm.mock.calls[0]?.[0]).toContain('Hal Reyes');
		// Declining issues nothing: no code exists until the manager has checked.
		expect(createGuestClaim).not.toHaveBeenCalled();
	});

	it('issues the code for this guest once the manager confirms', async () => {
		// Arrange
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const { store, createGuestClaim } = await renderActions(['run:queue', 'manage:guest-access']);

		// Act
		await userEvent.click(screen.getByRole('menuitem', { name: t.guestClaimShow }));

		// Assert
		expect(createGuestClaim).toHaveBeenCalledWith('guest-1');
		await vi.waitFor(() =>
			expect(store.admin.guestClaim).toMatchObject({
				guestName: 'Hal Reyes',
				replacesDevice: true,
			}),
		);
	});
});
