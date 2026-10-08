import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { AdminApi, AdminGuest } from '../../services/admin-api';
import type { QueuePlacement } from '../../services/guestAdmission';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { VisitEvent } from '../../services/visit-events';
import type { VisitCommand } from '../../services/visitStateMachine';
import type { SessionOverview } from '../../stores/market-session.store';
import { QueueDeskStore } from '../../stores/queue-desk.store';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { busyQueue, finishedQueue, queueGuest } from '../admin/queueGuests.fixture';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { QueueDeskProvider } from './queue-desk-context';
import { QueueDeskFrame } from './QueueDesk';
import { QueueLine } from './QueueLine';

const t = adminTranslations.en.queueDesk;
const eventId = 'story-event';

type QueueLineArgs = {
	guests: AdminGuest[];
	/** A visit whose ticket is already open, as if the volunteer had just tapped it. */
	openVisitId: string | null;
};

/** The fixture's people, each with a place in line, the way a drawn session numbers them. */
const numberedQueue: AdminGuest[] = [
	...busyQueue.map((guest, index) => ({
		...guest,
		queuePosition: index + 1,
		marketEventId: eventId,
	})),
	// Entered the lottery and was not drawn, so has no place in line.
	{
		...queueGuest({
			id: 'guest-not-placed-1',
			firstName: 'Tomás',
			lastName: 'Rivera',
			locale: 'es',
			status: 'not_placed',
			queuePosition: null,
		}),
		marketEventId: eventId,
	},
];

const matt = { kind: 'worker', id: 'auth0|story-worker', name: 'Matt' } as const;

/**
 * A plausible history for a guest in the story line: drawn in the lottery, then whatever brought
 * them to where they are now, each step a few minutes after the last.
 */
function historyFor(guest: AdminGuest | undefined): VisitEvent[] {
	if (!guest) {
		return [];
	}

	const start = Date.now() - 40 * 60_000;
	const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
	const event = (
		id: string,
		kind: VisitEvent['kind'],
		toStatus: VisitEvent['toStatus'],
		actor: VisitEvent['actor'],
		minutes: number,
		details: VisitEvent['details'] = {},
	): VisitEvent => ({
		id: `${guest.id}-${id}`,
		kind,
		toStatus,
		actor,
		details,
		createdAt: at(minutes),
	});
	const registered = event('registered', 'registered', 'registered', { kind: 'guest' }, 0);

	if (guest.status === 'not_placed') {
		return [registered, event('drawn', 'not_drawn', 'not_placed', { kind: 'system' }, 10)];
	}

	const drawn = event('drawn', 'drawn', 'waiting', { kind: 'system' }, 10, {
		queuePosition: guest.queuePosition ?? undefined,
	});
	const called = event('called', 'called', 'called', matt, 25);

	switch (guest.status) {
		case 'called':
			return [registered, drawn, called];
		case 'served':
			return [registered, drawn, called, event('served', 'served', 'served', matt, 30)];
		case 'no_show':
			return [registered, drawn, called, event('no-show', 'no_show', 'no_show', matt, 35)];
		default:
			return [registered, drawn];
	}
}

/**
 * A root store whose admin API answers from `guests`, and a desk over it. Built here rather than by
 * `QueueDesk`, which would sign in and fetch the real session.
 */
function seededDesk({ guests, openVisitId }: QueueLineArgs) {
	let roster = guests.map((guest) => ({ ...guest }));

	/** Calls the first guest still waiting, as the server's queue order would. */
	function callNext(): string[] {
		const next = roster.find((guest) => guest.status === 'waiting');

		if (!next) {
			return [];
		}

		roster = roster.map((guest) =>
			guest === next ? { ...guest, status: 'called', calledAt: new Date().toISOString() } : guest,
		);

		return [next.id];
	}

	/** Puts a guest back in line at the back or the front, the way the server does. */
	function returnToQueue(visitId: string, placement: QueuePlacement) {
		const positions = roster.map((guest) => guest.queuePosition ?? 0);
		const front = Math.min(
			...roster
				.filter((guest) => guest.status === 'waiting')
				.map((guest) => guest.queuePosition ?? 0),
		);
		const position = placement === 'end' ? Math.max(...positions) + 1 : front;

		roster = roster.map((guest) => {
			if (guest.id === visitId) {
				return { ...guest, status: 'waiting', calledAt: null, queuePosition: position };
			}

			return placement === 'next' && guest.status === 'waiting'
				? { ...guest, queuePosition: (guest.queuePosition ?? 0) + 1 }
				: guest;
		});
	}

	const api = {
		listSessionGuests: async () => roster,
		listVisitEvents: async (visitId: string) => historyFor(roster.find(({ id }) => id === visitId)),
		runGuestCommand: async (visitId: string, command: VisitCommand, placement?: QueuePlacement) => {
			if (command === 'return_to_queue' && placement) {
				returnToQueue(visitId, placement);
			}
		},
		callNext: async () => callNext(),
		serveAndCallNext: async (visitId: string) => {
			roster = roster.map((guest) =>
				guest.id === visitId ? { ...guest, status: 'served' } : guest,
			);

			return callNext();
		},
	} as unknown as AdminApi;
	const overview: SessionOverview = {
		event: {
			id: eventId,
			status: SessionStatusEnum.SERVICE_STARTED,
			capacity: 100,
			registrationOpensAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
			registrationClosesAt: new Date(Date.now() - 3_600_000).toISOString(),
		},
		questions: [],
		counts: {},
	};
	const store = new RootStore({
		admin: { api, readPermissions: async () => ['run:queue'] },
		// Every session request this screen sends is a read of the overview.
		session: { fetch: async () => Response.json(overview) },
	});

	store.session.applyServerState(overview);

	const desk = new QueueDeskStore(store.admin, store.session);

	void store.admin.refreshSessionGuests().then(() => {
		const open = store.admin.sessionGuests.find((guest) => guest.id === openVisitId);

		if (open) {
			desk.select(open);
		}
	});

	return { store, desk };
}

function SeededQueueLine(args: QueueLineArgs) {
	// Built once per set of args, so a re-render of the page around it keeps the same line.
	const [{ store, desk }] = useState(() => seededDesk(args));

	return (
		<RootStoreProvider store={store}>
			<QueueDeskProvider value={desk}>
				<QueueDeskFrame dir="ltr" lang="en">
					<QueueLine />
				</QueueDeskFrame>
			</QueueDeskProvider>
			{/* The decorator's sheet and toasts read its own store, not this seeded one. */}
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

/**
 * The `/queue` screen a volunteer runs the line from on their own phone: numbers only in the
 * lists, one ticket open at a time, and a single button to call the next guest.
 *
 * Check these at the default mobile viewport — that is the device this screen is for.
 */
const meta = {
	title: 'Queue/QueueLine',
	component: SeededQueueLine,
	parameters: { shell: 'bare' },
	render: (args) => <SeededQueueLine key={JSON.stringify(args)} {...args} />,
	args: {
		guests: numberedQueue,
		openVisitId: null,
	},
} satisfies Meta<typeof SeededQueueLine>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Service under way: two guests called, three waiting, one no-show, one guest the draw did not
 * place, and one served — each group in its own section.
 */
export const DuringService: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('button', { name: t.callNext })).toBeEnabled();
		await expect(
			await canvas.findByRole('button', {
				name: t.openTicket.replace('{number}', '3').replace('{name}', 'Linh Nguyen'),
			}),
		).toBeVisible();

		const noShows = within(await canvas.findByRole('region', { name: t.noShows }));
		const notPlaced = within(canvas.getByRole('region', { name: t.notPlaced }));
		const done = within(canvas.getByRole('region', { name: t.done }));

		await expect(noShows.getByText('Amira Haddad')).toBeVisible();
		await expect(notPlaced.getByText('Tomás Rivera')).toBeVisible();
		await expect(done.getByText('James Okafor')).toBeVisible();
		await expect(done.queryByText('Amira Haddad')).toBeNull();
	},
};

/**
 * The open ticket's sheet. Queries go through it rather than the whole page, because the list
 * behind the sheet carries the same names.
 */
async function openTicket() {
	return within(await within(document.body).findByLabelText(t.ticket));
}

/**
 * A called guest's ticket, open: the clock since they were called, the name tag to write out,
 * what to do once they reach the table, and the history of how they got there.
 */
export const TicketOpen: Story = {
	args: { openVisitId: 'guest-called-1' },
	play: async () => {
		// The list behind the sheet carries the name and language too, so read the tag itself.
		const name = await (await openTicket()).findByText('Maria S.');
		const tag = within(name.closest<HTMLElement>('.name-tag')!);

		await expect(name).toBeVisible();
		await expect(tag.getByText('ES')).toBeVisible();

		const history = within(
			await within(document.body).findByRole('region', { name: t.history.title }),
		);

		await expect(history.getByText(t.history.kinds.called)).toBeVisible();
		await expect(history.getByText(t.history.byWorker.replace('{name}', 'Matt'))).toBeVisible();
		await expect(history.getByText(t.history.byLottery)).toBeVisible();
	},
};

/**
 * At the table, serving the guest called most recently calls the next one in the same tap, and
 * their ticket — with the name tag to write — takes its place.
 */
export const ServingAndCallingNext: Story = {
	args: { openVisitId: 'guest-called-2' },
	play: async () => {
		const page = within(document.body);

		await userEvent.click(await page.findByRole('button', { name: t.serveAndCallNext }));

		await expect(await (await openTicket()).findByText('Linh N.')).toBeVisible();
	},
};

/**
 * A guest called earlier who has only now reached the table is a late arrival. Serving them must
 * not advance the line past the guest called most recently, so their ticket offers "Mark served"
 * alone.
 */
export const ServingALateArrival: Story = {
	args: { openVisitId: 'guest-called-1' },
	play: async () => {
		const page = within(document.body);

		await expect(
			await page.findByRole('button', { name: adminTranslations.en.markServed }),
		).toBeVisible();
		await expect(page.queryByRole('button', { name: t.serveAndCallNext })).toBeNull();
	},
};

/**
 * A no-show has, in effect, lost their turn, so returning one puts them at the back of the line by
 * default. The arrow beside the button offers the front instead, at the volunteer's discretion.
 */
export const ReturningANoShow: Story = {
	args: { openVisitId: 'guest-no-show-1' },
	play: async ({ canvasElement }) => {
		const page = within(document.body);

		await userEvent.click(await page.findByRole('button', { name: t.returnOptions }));
		await userEvent.click(await page.findByRole('menuitem', { name: t.returnToFront }));

		const waiting = within(within(canvasElement).getByRole('region', { name: t.waiting }));

		await expect(
			await waiting.findByRole('button', {
				name: t.openTicket.replace('{number}', '3').replace('{name}', 'Amira Haddad'),
			}),
		).toBeVisible();
	},
};

/** Calling the next guest opens their ticket straight away, name tag first. */
export const CallingNext: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(await canvas.findByRole('button', { name: t.callNext }));

		await expect(await (await openTicket()).findByText('Linh N.')).toBeVisible();
	},
};

/** Everyone is through, so the call button gives its place to closing the session. */
export const EveryoneThrough: Story = {
	args: {
		guests: finishedQueue.map((guest, index) => ({
			...guest,
			queuePosition: index + 1,
			marketEventId: eventId,
		})),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			await canvas.findByRole('button', { name: adminTranslations.en.closeSession }),
		).toBeVisible();
	},
};
