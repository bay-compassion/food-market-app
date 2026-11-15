import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import type { SessionDeletionBlock, SessionDeletionPreview } from '../../services/session-deletion';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { NotificationToasts } from '../ui/NotificationToasts';
import { SessionDeletionDialog } from './SessionDeletionDialog';

/**
 * The last step before a finished test session is deleted for good, opened from a past session's
 * menu in the session history by a data steward holding `delete:guest-data`. It names every guest
 * record that goes with the session, and the button stays disabled until the steward types the
 * session's date and start time; the server checks them again before it deletes anything.
 */
type SessionDeletionDialogArgs = { blockedBy: SessionDeletionBlock | 'none' };

const t = adminTranslations.en.sessionDeletion;

function previewWith(blockedBy: SessionDeletionBlock | null): SessionDeletionPreview {
	return {
		marketEventId: 'event-1',
		registrationOpensAt: '2026-11-14T17:30:00.000Z',
		registrationClosesAt: '2026-11-14T17:45:00.000Z',
		confirmation: '2026-11-14 09:30',
		blockedBy,
		coveringSnapshots:
			blockedBy === 'warehoused'
				? [
						{
							id: 'snapshot-quarter',
							kind: 'quarter',
							periodStart: '2026-10-01T07:00:00.000Z',
							periodEnd: '2027-01-01T08:00:00.000Z',
							revision: 1,
						},
						{
							id: 'snapshot-month',
							kind: 'month',
							periodStart: '2026-11-01T07:00:00.000Z',
							periodEnd: '2026-12-01T08:00:00.000Z',
							revision: 1,
						},
						{
							id: 'snapshot-session',
							kind: 'session',
							periodStart: '2026-11-14T17:30:00.000Z',
							periodEnd: '2026-11-14T17:30:00.001Z',
							revision: 1,
						},
					]
				: [],
		sessionOnlyGuests: [
			{ guestId: 'guest-1', firstName: 'Tess', lastName: 'Tester' },
			{ guestId: 'guest-2', firstName: 'Quinn', lastName: 'Trial' },
		],
		keptGuests: 1,
		rows: {
			household_service_entries: 2,
			visits: 3,
			visit_events: 11,
			notification_deliveries: 4,
			push_subscriptions: 1,
			guests: 2,
			registration_questions: 1,
			lottery_odds_changes: 0,
		},
	};
}

/** A store whose dialog is already open for the session, against an API that answers in memory. */
function SeededDialog({ blockedBy }: SessionDeletionDialogArgs) {
	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = (input: string, init?: RequestInit) =>
			Promise.resolve(
				input.endsWith('/deletion')
					? Response.json(previewWith(blockedBy === 'none' ? null : blockedBy))
					: init?.method === 'DELETE'
						? new Response(null, { status: 204 })
						: Response.json([]),
			);
		const created = new RootStore({
			admin: { api: new AdminApi({ request: request as typeof fetch }) },
		});

		void created.admin.sessionDeletion.open('event-1');

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<SessionDeletionDialog />
			{/* The decorator's toaster reads the decorator's store, not this one. */}
			<NotificationToasts />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: SessionDeletionDialogArgs) {
	return <SeededDialog key={args.blockedBy} {...args} />;
}

const meta = {
	title: 'Admin/Session History/Delete Test Session Dialog',
	component: Fixture,
	parameters: { shell: 'admin' },
	args: { blockedBy: 'none' },
	argTypes: {
		blockedBy: { control: 'inline-radio', options: ['none', 'not-ended', 'warehoused'] },
	},
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The steward reads who goes with the session, types its date and time, and only its own deletes. */
export const TypeToConfirm: Story = {
	play: async ({ userEvent }) => {
		// The dialog renders in a portal outside the story's canvas.
		const confirm = await screen.findByRole('button', { name: t.confirm });
		const field = screen.getByLabelText(t.confirmLabel);

		await expect(screen.getByText('Tess Tester')).toBeVisible();
		await expect(screen.getByText('Quinn Trial')).toBeVisible();
		await expect(confirm).toBeDisabled();
		// The right day at another session's time is still the wrong session.
		await userEvent.type(field, '2026-11-14 14:00');
		await expect(confirm).toBeDisabled();
		await userEvent.clear(field);
		await userEvent.type(field, '2026-11-14 09:30');
		await expect(confirm).toBeEnabled();
		await userEvent.click(confirm);
		await expect(await screen.findByRole('alert')).toHaveTextContent(t.deleted);
	},
};

/** A session still running: the dialog explains, and offers no field at all. */
export const NotEnded: Story = {
	args: { blockedBy: 'not-ended' },
	play: async () => {
		await expect(await screen.findByRole('alert')).toHaveTextContent(t.notEnded);
		await expect(screen.queryByLabelText(t.confirmLabel)).not.toBeInTheDocument();
		await expect(screen.getByRole('button', { name: t.confirm })).toBeDisabled();
	},
};

/**
 * A session the warehouse has frozen: the dialog lists every snapshot that counts it, and offers
 * the rest only once the steward ticks the box that removes those snapshots too.
 */
export const AlreadyWarehoused: Story = {
	args: { blockedBy: 'warehoused' },
	play: async ({ userEvent }) => {
		await expect(await screen.findByRole('alert')).toHaveTextContent(t.warehoused);
		await expect(screen.getByText(t.snapshotKinds.session)).toBeVisible();
		await expect(screen.getByText(/^Month of November 2026$/)).toBeVisible();
		await expect(screen.getByText('Q4 2026')).toBeVisible();
		await expect(screen.queryByLabelText(t.confirmLabel)).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('checkbox', { name: t.forceLabel }));
		await userEvent.type(screen.getByLabelText(t.confirmLabel), '2026-11-14 09:30');
		await userEvent.click(screen.getByRole('button', { name: t.confirm }));
		await expect(await screen.findByText(t.deleted)).toBeVisible();
	},
};
