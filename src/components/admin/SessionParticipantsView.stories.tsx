import type { Meta, StoryObj } from '@storybook/react-vite';
import { StrictMode, useState } from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi, type AdminGuest, type HistoricalEvent } from '../../services/admin-api';
import type { VisitEvent } from '../../services/visit-events';
import type { VisitStatus } from '../../services/visitStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { SessionParticipantsView } from './SessionParticipantsView';

/**
 * The session history's subview, at `/admin/session-history/:sessionId`, opened by tapping a past
 * session for whoever holds `export:guest-data`. It is laid out as the queue is: a folding section
 * of tickets per status, and the tapped ticket in a sheet on a phone or a pane to the right on a
 * desk. The ticket is where a status recorded wrong on the day is corrected, after a confirmation.
 */
type SessionParticipantsViewArgs = { refuse: boolean };

const t = adminTranslations.en;

const session: HistoricalEvent = {
	id: 'event-1',
	registrationOpensAt: '2026-11-14T17:30:00.000Z',
	registrationClosesAt: '2026-11-14T17:45:00.000Z',
	capacity: 40,
	status: 'ended',
	guestCount: 5,
};

function guest(
	id: string,
	name: [string, string],
	status: VisitStatus,
	queuePosition: number | null,
	householdSize = 3,
): AdminGuest {
	return {
		id,
		guestId: `guest-${id}`,
		marketEventId: session.id,
		firstName: name[0],
		lastName: name[1],
		pronunciation: null,
		staffNotes: null,
		phone: '5105550100',
		householdSize,
		locale: 'en',
		queuePosition,
		priorityNumber: null,
		queueFront: false,
		queueOrder: null,
		calledAt: null,
		status,
		track: 'lottery',
	};
}

const guests = [
	guest('visit-1', ['Ana', 'Reyes'], 'served', 1, 4),
	guest('visit-2', ['Bao', 'Nguyen'], 'served', 2),
	guest('visit-3', ['Cyrus', 'Rahimi'], 'no_show', 3, 2),
	guest('visit-4', ['Dana', 'Okafor'], 'not_placed', null, 5),
	guest('visit-5', ['Eli', 'Moreno'], 'cancelled', null, 1),
];

const lee = { kind: 'worker', id: 'auth0|lee', name: 'Lee' } as const;

const history: VisitEvent[] = [
	{
		id: 'e1',
		kind: 'drawn',
		toStatus: 'waiting',
		actor: { kind: 'system' },
		details: { queuePosition: 3 },
		createdAt: '2026-11-14T17:46:00.000Z',
	},
	{
		id: 'e2',
		kind: 'called',
		toStatus: 'called',
		actor: lee,
		details: {},
		createdAt: '2026-11-14T18:20:00.000Z',
	},
	{
		id: 'e3',
		kind: 'no_show',
		toStatus: 'no_show',
		actor: lee,
		details: {},
		createdAt: '2026-11-14T18:31:00.000Z',
	},
];

/** A store whose history lists the session, against an API that answers in memory. */
function SeededView({ refuse }: SessionParticipantsViewArgs) {
	const [store] = useState(() => {
		let corrected = false;
		// `AdminApi` only ever requests a plain path string.
		const request = (input: string, init?: RequestInit) => {
			if (init?.method === 'PATCH') {
				corrected = !refuse;
				const visitId = decodeURIComponent(input.split('/').at(-1) ?? '');
				const { status } = JSON.parse(init.body as string) as { status: VisitStatus };

				return Promise.resolve(
					refuse
						? Response.json(
								{
									error:
										'This guest’s status changed since the list was loaded. Refresh and try again.',
								},
								{ status: 409 },
							)
						: Response.json({ id: visitId, status }),
				);
			}

			if (input.includes('/events')) {
				const events: VisitEvent[] = corrected
					? [
							...history,
							{
								id: 'e4',
								kind: 'corrected',
								toStatus: 'served',
								actor: lee,
								details: { fromStatus: 'no_show' },
								createdAt: new Date().toISOString(),
							},
						]
					: history;

				return Promise.resolve(Response.json({ events }));
			}

			return Promise.resolve(Response.json(input.includes('view=history') ? [session] : guests));
		};
		const created = new RootStore({
			admin: { api: new AdminApi({ request: request as typeof fetch }) },
		});

		void created.admin.refreshHistory();

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<SessionParticipantsView sessionId={session.id} onBack={() => {}} />
			{/* The decorator's copies read the decorator's store, not this one. */}
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: SessionParticipantsViewArgs) {
	return <SeededView key={String(args.refuse)} {...args} />;
}

const meta = {
	title: 'Admin/Session History/Session Participants',
	component: Fixture,
	parameters: { shell: 'admin' },
	args: { refuse: false },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

const openTicket = (number: string, name: string) =>
	t.queueDesk.openTicket.replace('{number}', number).replace('{name}', name);
const markServed = t.participants.changeTo.replace('{status}', t.served);

/** On a phone: the tickets by status, and a tapped one in a sheet with what happened to it. */
export const Phone: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole('button', { name: openTicket('3', 'Cyrus Rahimi') }),
		);

		// The sheet renders in a portal outside the story's canvas.
		await expect(await screen.findByText('Marked no-show')).toBeVisible();
		await expect(screen.getByRole('button', { name: markServed })).toBeVisible();
	},
};

/**
 * On a desk, the ticket sits to the right. A guest marked a no-show who was in fact served moves to
 * Served once the change is confirmed, and the ticket's history shows the correction.
 */
export const CorrectAStatus: Story = {
	globals: { viewport: { value: 'ipad12p', isRotated: true } },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole('button', { name: openTicket('3', 'Cyrus Rahimi') }),
		);
		await userEvent.click(await screen.findByRole('button', { name: markServed }));

		const sheet = await within(document.body).findByRole('alertdialog');

		await userEvent.click(within(sheet).getByRole('button', { name: t.participants.confirm }));
		await expect(await screen.findByText(t.participants.corrected)).toBeVisible();
		await expect(await screen.findByText(t.queueDesk.history.kinds.corrected)).toBeVisible();
		await expect(canvas.getByRole('region', { name: t.served })).toHaveTextContent('Cyrus Rahimi');
	},
};

/** Someone else corrected the guest first: the server's reason is shown and nothing moves. */
export const RefusedAsStale: Story = {
	args: { refuse: true },
	globals: { viewport: { value: 'ipad12p', isRotated: true } },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole('button', { name: openTicket('3', 'Cyrus Rahimi') }),
		);
		await userEvent.click(await screen.findByRole('button', { name: markServed }));

		const sheet = await within(document.body).findByRole('alertdialog');

		await userEvent.click(within(sheet).getByRole('button', { name: t.participants.confirm }));
		await expect(await screen.findByText(/changed since the list was loaded/)).toBeVisible();
		await expect(canvas.getByRole('region', { name: t.noShow })).toHaveTextContent('Cyrus Rahimi');
	},
};

const checkTicket = (number: string, name: string) =>
	t.participants.checkTicket.replace('{number}', number).replace('{name}', name);

/**
 * On a phone, Select turns the tickets into checkboxes and docks a bar on the tab bar. Two guests
 * who were in fact served are picked out and corrected together, after one confirmation.
 */
export const CorrectSeveralOnPhone: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.participants.select }));
		await userEvent.click(canvas.getByRole('checkbox', { name: checkTicket('3', 'Cyrus Rahimi') }));
		await userEvent.click(canvas.getByRole('checkbox', { name: checkTicket('—', 'Dana Okafor') }));

		const bar = canvas.getByRole('region', { name: t.participants.bulkTitle });

		await expect(bar).toHaveTextContent(t.participants.selected.replace('{count}', '2'));
		await userEvent.click(within(bar).getByRole('button', { name: markServed }));

		const sheet = await within(document.body).findByRole('alertdialog');

		await expect(sheet).toHaveTextContent(
			t.participants.bulkConfirmQuestion.replace('{guests}', '2 guests').replace('{to}', t.served),
		);
		await userEvent.click(within(sheet).getByRole('button', { name: t.participants.confirm }));
		await expect(
			await screen.findByText(t.participants.bulkCorrected.replace('{guests}', '2 guests')),
		).toBeVisible();

		const servedSection = canvas.getByRole('region', { name: t.served });

		await expect(servedSection).toHaveTextContent('Cyrus Rahimi');
		await expect(servedSection).toHaveTextContent('Dana Okafor');
		await expect(canvas.queryByRole('region', { name: t.participants.bulkTitle })).toBeNull();
	},
};

/**
 * On a desk, the bar sits under the list. A section's Select All picks out everyone in it; a
 * status they all already have is not offered.
 */
export const SelectASectionOnDesk: Story = {
	globals: { viewport: { value: 'ipad12p', isRotated: true } },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.participants.select }));
		await userEvent.click(
			canvas.getByRole('button', {
				name: t.participants.selectAllLabel.replace('{status}', t.served),
			}),
		);

		const bar = canvas.getByRole('region', { name: t.participants.bulkTitle });

		await expect(bar).toHaveTextContent(t.participants.selected.replace('{count}', '2'));
		await expect(within(bar).queryByRole('button', { name: markServed })).toBeNull();
		await expect(
			within(bar).getByRole('button', {
				name: t.participants.changeTo.replace('{status}', t.noShow),
			}),
		).toBeVisible();
	},
};

/** Searching finds a guest anywhere in the session; picking the one found opens their ticket. */
export const SearchToOpen: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.participants.openSearch }));

		const dialog = within(await screen.findByRole('dialog', { name: t.queueDesk.search }));
		const field = dialog.getByRole('searchbox', { name: t.queueDesk.search });

		// Ready to type into straight away, with no second tap to raise a phone's keyboard.
		await expect(field).toHaveFocus();
		await userEvent.type(field, 'dana');
		await userEvent.keyboard('{Enter}');

		// The sheet renders in a portal outside the story's canvas.
		const correctTitle = await screen.findByText(t.participants.correctTitle);

		await expect(correctTitle.closest('.MuiDrawer-paper')).toHaveTextContent('Dana Okafor');
		// The search fades out, so it is still in the page for the first frames after it closes.
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: t.queueDesk.search })).toBeNull(),
		);
	},
};

/** While selecting, a guest found by search is checked rather than opened, and the search stays. */
export const SearchWhileSelecting: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.participants.select }));
		await userEvent.click(canvas.getByRole('button', { name: t.participants.openSearch }));

		const dialog = within(await screen.findByRole('dialog', { name: t.queueDesk.search }));

		await userEvent.type(dialog.getByRole('searchbox', { name: t.queueDesk.search }), 'cyrus');
		await userEvent.click(dialog.getByRole('checkbox', { name: checkTicket('3', 'Cyrus Rahimi') }));

		await expect(
			dialog.getByRole('checkbox', { name: checkTicket('3', 'Cyrus Rahimi') }),
		).toBeChecked();
		await userEvent.click(dialog.getByRole('button', { name: t.queueDesk.closeSearch }));
		await expect(
			await canvas.findByRole('region', { name: t.participants.bulkTitle }),
		).toHaveTextContent(t.participants.selected.replace('{count}', '1'));
	},
};

/** Each status's guests read by last name rather than number. */
export const SortedByLastName: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole('button', {
				name: t.queueDesk.sortLabel.replace('{order}', t.queueDesk.orders.queue),
			}),
		);
		await userEvent.click(
			await within(document.body).findByRole('menuitemradio', {
				name: t.queueDesk.orders.lastName,
			}),
		);

		const served = within(canvas.getByRole('region', { name: t.served }));
		const names = served
			.getAllByRole('button', { name: /^Open ticket / })
			.map((ticket) => ticket.querySelector('.name')?.textContent);

		// Ana Reyes is number 1 and Bao Nguyen number 2; by last name, Nguyen comes first.
		await expect(names).toEqual(['Bao Nguyen', 'Ana Reyes']);
	},
};

/**
 * Opening the search puts the cursor in its field, ready to type. Rendered in `StrictMode`, as the
 * app is: there the dialog's focus trap is set up twice, and focus given only on mount was lost to
 * the dialog itself.
 */
export const SearchFocusesItsField: Story = {
	decorators: [
		(Story) => (
			<StrictMode>
				<Story />
			</StrictMode>
		),
	],
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.participants.openSearch }));

		const dialog = within(await screen.findByRole('dialog', { name: t.queueDesk.search }));

		await waitFor(() =>
			expect(dialog.getByRole('searchbox', { name: t.queueDesk.search })).toHaveFocus(),
		);
	},
};
