import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { AdminApi, AdminGuest } from '../../services/admin-api';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { SessionOverview } from '../../stores/market-session.store';
import { QueueDeskStore } from '../../stores/queue-desk.store';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { busyQueue, finishedQueue } from '../admin/queueGuests.fixture';
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
const numberedQueue: AdminGuest[] = busyQueue.map((guest, index) => ({
	...guest,
	queuePosition: index + 1,
	marketEventId: eventId,
}));

/**
 * A root store whose admin API answers from `guests`, and a desk over it. Built here rather than by
 * `QueueDesk`, which would sign in and fetch the real session.
 */
function seededDesk({ guests, openVisitId }: QueueLineArgs) {
	let roster = guests.map((guest) => ({ ...guest }));
	const api = {
		listSessionGuests: async () => roster,
		runGuestCommand: async () => {},
		callNext: async () => {
			const next = roster.find((guest) => guest.status === 'waiting');

			if (!next) {
				return [];
			}

			roster = roster.map((guest) =>
				guest === next ? { ...guest, status: 'called', calledAt: new Date().toISOString() } : guest,
			);

			return [next.id];
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

/** Service under way: two guests called, three waiting, two finished. */
export const DuringService: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('button', { name: t.callNext })).toBeEnabled();
		await expect(
			await canvas.findByRole('button', {
				name: t.openTicket.replace('{number}', '3').replace('{name}', 'Linh Nguyen'),
			}),
		).toBeVisible();
	},
};

/**
 * A called guest's ticket, open: the clock since they were called, the name tag to write out, and
 * what to do once they reach the table.
 */
export const TicketOpen: Story = {
	args: { openVisitId: 'guest-called-1' },
	play: async () => {
		// The list behind the sheet carries the name and language too, so read the tag itself.
		const name = await within(document.body).findByText('Maria S.');
		const tag = within(name.closest<HTMLElement>('.name-tag')!);

		await expect(name).toBeVisible();
		await expect(tag.getByText('ES')).toBeVisible();
	},
};

/** Calling the next guest opens their ticket straight away, name tag first. */
export const CallingNext: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(await canvas.findByRole('button', { name: t.callNext }));

		await expect(await within(document.body).findByText('Linh N.')).toBeVisible();
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
