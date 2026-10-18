import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { GuestDeletionDialog } from '../components/admin/GuestDeletionDialog';
import { QueueGuestActions } from '../components/admin/QueueGuestActions';
import type { AdminApi, QueueGuest } from '../services/admin-api';
import type { GuestDeletionPreview } from '../services/guest-deletion';
import type { Permission } from '../services/permissions';
import { RootStore } from '../stores/root.store';
import { renderWithApp } from './render-with-app';

const t = adminTranslations.en;

const guest: QueueGuest = {
	id: 'visit-1',
	guestId: 'guest-1',
	firstName: 'Hal',
	lastName: 'Reyes',
	pronunciation: null,
	staffNotes: null,
	phone: '(510) 555-0142',
	householdSize: 2,
	locale: 'en',
	queuePosition: null,
	priorityNumber: null,
	queueFront: false,
	queueOrder: null,
	calledAt: null,
	status: 'served',
};

function previewWith(overrides: Partial<GuestDeletionPreview> = {}): GuestDeletionPreview {
	return {
		guestId: 'guest-1',
		firstName: 'Hal',
		lastName: 'Reyes',
		phone: '(510) 555-0142',
		signedUpAt: '2026-09-27T17:00:00.000Z',
		inOpenSession: false,
		rows: {
			visits: 4,
			visit_events: 6,
			notification_deliveries: 2,
			push_subscriptions: 0,
			sms_subscriptions: 1,
			sms_opt_outs: 0,
			guest_claims: 0,
		},
		...overrides,
	};
}

async function renderWith(
	permissions: Permission[],
	preview = previewWith(),
	{ offerDeletion = true } = {},
) {
	const api = {
		previewGuestDeletion: vi.fn().mockResolvedValue(preview),
		deleteGuest: vi.fn().mockResolvedValue(undefined),
		listAllGuests: vi.fn().mockResolvedValue([]),
		listSessionGuests: vi.fn().mockResolvedValue([]),
	};
	const store = new RootStore({
		admin: {
			api: api as unknown as AdminApi,
			readPermissions: () => Promise.resolve(permissions),
		},
	});

	await store.admin.loadPermissions();
	renderWithApp(
		<>
			<QueueGuestActions guest={guest} menuOnly offerDeletion={offerDeletion} onRun={vi.fn()} />
			<GuestDeletionDialog />
		</>,
		{ store },
	);
	await userEvent.click(screen.getByRole('button', { name: `${t.moreActions}: Hal Reyes` }));

	return { api, store };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Permanent guest deletion', () => {
	it('is not offered without delete:guest-data', async () => {
		// Act
		await renderWith(['run:queue', 'export:guest-data']);

		// Assert
		expect(screen.queryByRole('menuitem', { name: t.guestDeleteShow })).toBeNull();
	});

	it('is not offered outside the guest database', async () => {
		// Act
		await renderWith(['export:guest-data', 'delete:guest-data'], previewWith(), {
			offerDeletion: false,
		});

		// Assert
		expect(screen.queryByRole('menuitem', { name: t.guestDeleteShow })).toBeNull();
	});

	it('deletes only once the guest’s phone number is typed', async () => {
		// Arrange
		const { api } = await renderWith(['export:guest-data', 'delete:guest-data']);

		await userEvent.click(screen.getByRole('menuitem', { name: t.guestDeleteShow }));
		const confirm = await screen.findByRole('button', { name: t.guestDeleteConfirm });
		const field = screen.getByLabelText(t.guestDeletePhoneLabel);

		// Act
		await userEvent.type(field, '510 555 0199');
		const disabledForWrongNumber = confirm.hasAttribute('disabled');

		await userEvent.clear(field);
		await userEvent.type(field, '5105550142');
		await userEvent.click(confirm);

		// Assert
		expect(disabledForWrongNumber).toBe(true);
		expect(api.deleteGuest).toHaveBeenCalledWith('guest-1', '5105550142');
		expect(screen.queryByRole('button', { name: t.guestDeleteConfirm })).toBeNull();
	});

	it('offers no way to delete a guest in a session that has not ended', async () => {
		// Arrange
		await renderWith(
			['export:guest-data', 'delete:guest-data'],
			previewWith({ inOpenSession: true }),
		);

		// Act
		await userEvent.click(screen.getByRole('menuitem', { name: t.guestDeleteShow }));

		// Assert
		expect((await screen.findByRole('alert')).textContent).toBe(t.guestDeleteInOpenSession);
		expect(screen.queryByLabelText(t.guestDeletePhoneLabel)).toBeNull();
		expect(
			screen.getByRole('button', { name: t.guestDeleteConfirm }).hasAttribute('disabled'),
		).toBe(true);
	});
});
