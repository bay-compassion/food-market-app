import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import type { GuestDeletionPreview } from '../../services/guest-deletion';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { NotificationToasts } from '../ui/NotificationToasts';
import { GuestDeletionDialog } from './GuestDeletionDialog';

/**
 * The last step before a guest is deleted for good, opened from a guest's actions menu in the guest
 * database by an admin holding `delete:guest-data`. The button stays disabled until the admin types
 * the guest's phone number; the server checks the number again before it deletes anything.
 */
type GuestDeletionDialogArgs = { inOpenSession: boolean };

const t = adminTranslations.en;

function previewWith(inOpenSession: boolean): GuestDeletionPreview {
	return {
		guestId: 'guest-1',
		firstName: 'Ada',
		lastName: 'Lovelace',
		phone: '(510) 555-0123',
		signedUpAt: '2026-09-27T17:00:00.000Z',
		inOpenSession,
		rows: {
			visits: 4,
			visit_events: 9,
			notification_deliveries: 3,
			push_subscriptions: 1,
			sms_subscriptions: 1,
			sms_opt_outs: 0,
			guest_claims: 0,
		},
	};
}

/** A store whose dialog is already open for the guest, against an API that answers in memory. */
function SeededDialog({ inOpenSession }: GuestDeletionDialogArgs) {
	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = (input: string, init?: RequestInit) =>
			Promise.resolve(
				input.endsWith('/deletion')
					? Response.json(previewWith(inOpenSession))
					: init?.method === 'DELETE'
						? new Response(null, { status: 204 })
						: Response.json([]),
			);
		const created = new RootStore({
			admin: { api: new AdminApi({ request: request as typeof fetch }) },
		});

		void created.admin.openGuestDeletion('guest-1');

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<GuestDeletionDialog />
			{/* The decorator's toaster reads the decorator's store, not this one. */}
			<NotificationToasts />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: GuestDeletionDialogArgs) {
	return <SeededDialog key={String(args.inOpenSession)} {...args} />;
}

const meta = {
	title: 'Admin/Guest Database/Delete Guest Dialog',
	component: Fixture,
	parameters: { shell: 'admin' },
	args: { inOpenSession: false },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The admin types the guest's number, and only the right one wakes the delete button. */
export const TypeToConfirm: Story = {
	play: async ({ userEvent }) => {
		// The dialog renders in a portal outside the story's canvas.
		const confirm = await screen.findByRole('button', { name: t.guestDeleteConfirm });
		const field = screen.getByLabelText(t.guestDeletePhoneLabel);

		await expect(confirm).toBeDisabled();
		await userEvent.type(field, '510-555-0199');
		await expect(confirm).toBeDisabled();
		await userEvent.clear(field);
		await userEvent.type(field, '510-555-0123');
		await expect(confirm).toBeEnabled();
		await userEvent.click(confirm);
		await expect(await screen.findByRole('alert')).toHaveTextContent(
			t.guestDeleted.replace('{name}', 'Ada Lovelace'),
		);
	},
};

/** A guest still in a session that has not ended: the dialog explains, and offers no field at all. */
export const InOpenSession: Story = {
	args: { inOpenSession: true },
	play: async () => {
		await expect(await screen.findByRole('alert')).toHaveTextContent(t.guestDeleteInOpenSession);
		await expect(screen.queryByLabelText(t.guestDeletePhoneLabel)).not.toBeInTheDocument();
		await expect(screen.getByRole('button', { name: t.guestDeleteConfirm })).toBeDisabled();
	},
};
