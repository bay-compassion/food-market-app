import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { AdminGuest } from '../../services/admin-api';
import { QueueDeskStore } from '../../stores/queue-desk.store';
import { RootStoreProvider } from '../../stores/react/store-context';
import { finishedQueue, queueGuest } from '../admin/queueGuests.fixture';
import { visitCommandLabels } from '../admin/VisitCommandButtons';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { QueueDeskProvider } from './queue-desk-context';
import { QueueDeskFrame } from './QueueDesk';
import { QueueLine } from './QueueLine';
import { numberedQueue, seededEventId, seededQueueStore } from './seeded-queue.fixture';

const t = adminTranslations.en.queueDesk;

type QueueLineArgs = {
	guests: AdminGuest[];
	/** A visit whose ticket is already open, as if the volunteer had just tapped it. */
	openVisitId: string | null;
	/** How long each request takes to answer, for what the screen does while one is on its way. */
	latencyMs?: number;
};

/** The seeded store, and a desk over it with `openVisitId`'s ticket open once the line loads. */
function seededDesk({ guests, openVisitId, latencyMs }: QueueLineArgs) {
	const store = seededQueueStore({ guests, latencyMs });
	const desk = new QueueDeskStore(store.admin, store.session, {
		notifications: store.notifications,
	});

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
 * Check these at the default mobile viewport — a volunteer's phone is what this screen is mostly
 * for. The stories at the end are the check-in desk's computer, wide enough for the desk layout.
 */
const meta = {
	title: 'Staff/Queue Desk/Line',
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

		await expect(
			await canvas.findByRole('button', { name: t.callNextNumber.replace('{number}', '3') }),
		).toBeEnabled();
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

/** Standby guests in their own section, in S order. Calling next still calls the line. */
const withStandby: AdminGuest[] = [
	...numberedQueue,
	{
		...queueGuest({
			id: 'guest-standby-1',
			firstName: 'Ama',
			lastName: 'Owusu',
			status: 'called',
			queuePosition: null,
			calledAt: new Date(Date.now() - 60_000).toISOString(),
		}),
		track: 'postmarket',
		standbyNumber: 1,
		marketEventId: seededEventId,
	},
	{
		...queueGuest({
			id: 'guest-standby-2',
			firstName: 'Kenji',
			lastName: 'Sato',
			status: 'waiting',
			queuePosition: null,
		}),
		track: 'postmarket',
		standbyNumber: 2,
		marketEventId: seededEventId,
	},
];

/**
 * Standby has a section of its own after the line, in S order. Calling next still calls the
 * line's next number; standby guests are admitted from their own tickets.
 */
export const Standby: Story = {
	args: { guests: withStandby },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const standby = within(await canvas.findByRole('region', { name: t.standby }));

		await expect(
			standby.getByRole('button', {
				name: t.openTicket.replace('{number}', 'S1').replace('{name}', 'Ama Owusu'),
			}),
		).toBeVisible();
		await expect(
			standby.getByRole('button', {
				name: t.openTicket.replace('{number}', 'S2').replace('{name}', 'Kenji Sato'),
			}),
		).toBeVisible();
		await expect(
			canvas.getByRole('button', { name: t.callNextNumber.replace('{number}', '3') }),
		).toBeEnabled();
		await expect(
			within(canvas.getByRole('region', { name: t.called })).queryByText('Ama Owusu'),
		).toBeNull();
	},
};

/** A waiting standby guest is admitted, never marked a no-show. */
export const AdmittingFromStandby: Story = {
	args: { guests: withStandby, openVisitId: 'guest-standby-2' },
	play: async () => {
		const page = within(document.body);
		const labels = visitCommandLabels('postmarket');

		await expect(await page.findByRole('button', { name: labels.call })).toBeVisible();
		await expect(page.queryByRole('button', { name: labels.mark_no_show })).toBeNull();
		await expect(page.queryByRole('button', { name: t.returnOptions })).toBeNull();
	},
};

/** Taking a called standby guest off the list asks first, then cancels their visit. */
export const TakingAGuestOffStandby: Story = {
	args: { guests: withStandby, openVisitId: 'guest-standby-1' },
	play: async ({ canvasElement }) => {
		const page = within(document.body);
		const labels = visitCommandLabels('postmarket');

		await userEvent.click(await page.findByRole('button', { name: labels.cancel }));

		const dialog = within(await page.findByRole('alertdialog'));

		await userEvent.click(dialog.getByRole('button', { name: labels.cancel }));

		const done = within(await within(canvasElement).findByRole('region', { name: t.done }));

		await expect(await done.findByText('Ama Owusu')).toBeVisible();
	},
};

/** On a phone, adding a guest by hand sits in the menu beside the call button. */
export const AddingAGuestFromTheCallBar: Story = {
	play: async ({ canvasElement, userEvent }) => {
		const canvas = within(canvasElement);

		await userEvent.click(await canvas.findByRole('button', { name: t.lineActions }));
		await userEvent.click(await within(document.body).findByRole('menuitem', { name: t.addGuest }));

		await expect(await within(document.body).findByRole('dialog')).toBeVisible();
		await expect(canvas.queryByRole('button', { name: t.addGuest })).toBeNull();
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
			await within(document.body).findByRole('region', {
				name: t.history.title,
			}),
		);

		await expect(history.getByText(t.history.kinds.called)).toBeVisible();
		await expect(history.getByText(t.history.byWorker.replace('{name}', 'Matt'))).toBeVisible();
		await expect(history.getByText(t.history.byLottery)).toBeVisible();
	},
};

/** How to say the guest's name — as they wrote it on their phone — edited from the open ticket. */
export const EditingGuestDetails: Story = {
	args: {
		guests: numberedQueue.map((guest) =>
			guest.id === 'guest-called-1' ? { ...guest, pronunciation: 'mah-REE-ah' } : guest,
		),
		openVisitId: 'guest-called-1',
	},
	play: async () => {
		const ticket = await openTicket();
		const details = within(await ticket.findByRole('form', { name: t.guestDetails.title }));
		const save = details.getByRole('button', { name: t.guestDetails.save });

		const pronunciation = details.getByLabelText(t.guestDetails.pronunciation);

		await expect(pronunciation).toHaveValue('mah-REE-ah');
		await expect(save).toBeDisabled();

		await userEvent.clear(pronunciation);
		await userEvent.type(pronunciation, 'mah-REE-uh');
		await userEvent.click(save);

		await expect(await within(document.body).findByText(t.guestDetails.saved)).toBeVisible();
		await expect(save).toBeDisabled();
	},
};

/**
 * The staff notes on an open ticket, newest first. A note from an earlier session is locked to
 * team leaders, so it has no action menu; today's screenshot notice, written by this volunteer,
 * does, and editing from it opens the same dialog as adding.
 * Add Note opens the note form in a dialog; the split button's menu warns about screenshots in one
 * tap, which raises the count.
 */
export const KeepingStaffNotes: Story = {
	args: { openVisitId: 'guest-called-1' },
	play: async () => {
		const notes = within(
			await (await openTicket()).findByRole('region', { name: t.guestNotes.title }),
		);

		await expect(
			await notes.findByText('Uses a cane; offer a chair while she waits.'),
		).toBeVisible();
		await expect(notes.getByText(t.guestNotes.screenshotNotice.countOne)).toBeVisible();
		await expect(notes.getAllByRole('button', { name: t.guestNotes.actions })).toHaveLength(1);
		await expect(notes.getByText(t.guestNotes.lockedHelp)).toBeVisible();

		await userEvent.click(notes.getByRole('button', { name: t.guestNotes.add }));

		const dialog = within(await within(document.body).findByRole('dialog'));

		await userEvent.type(
			dialog.getByRole('textbox', { name: t.guestNotes.note }),
			'Prefers to be called by her first name.',
		);
		await userEvent.selectOptions(
			dialog.getByRole('combobox', { name: t.guestNotes.category }),
			'Accommodation',
		);
		await userEvent.click(dialog.getByRole('button', { name: t.guestNotes.add }));

		await expect(await notes.findByText('Prefers to be called by her first name.')).toBeVisible();
		await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());

		// The newest note is first, so its menu is the first one.
		await userEvent.click(notes.getAllByRole('button', { name: t.guestNotes.actions })[0]!);
		await userEvent.click(
			await within(document.body).findByRole('menuitem', { name: t.guestNotes.edit }),
		);

		const editing = within(await within(document.body).findByRole('dialog'));
		const body = editing.getByRole('textbox', { name: t.guestNotes.note });

		await expect(body).toHaveValue('Prefers to be called by her first name.');
		await userEvent.clear(body);
		await userEvent.type(body, 'Prefers to be called Mari.');
		await userEvent.click(editing.getByRole('button', { name: t.guestNotes.save }));

		await expect(await notes.findByText('Prefers to be called Mari.')).toBeVisible();
		await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());

		await userEvent.click(notes.getByRole('button', { name: t.guestNotes.moreAddOptions }));
		await userEvent.click(
			await within(document.body).findByRole('menuitem', {
				name: t.guestNotes.screenshotNotice.record,
			}),
		);

		await expect(
			await notes.findByText(t.guestNotes.screenshotNotice.count.replace('{count}', '2')),
		).toBeVisible();
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
			await page.findByRole('button', {
				name: adminTranslations.en.markServed,
			}),
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

		await userEvent.click(
			await canvas.findByRole('button', { name: t.callNextNumber.replace('{number}', '3') }),
		);

		await expect(await (await openTicket()).findByText('Linh N.')).toBeVisible();
		// The button moves on to the number now at the front of the line.
		await expect(
			canvas.getByRole('button', { name: t.callNextNumber.replace('{number}', '4') }),
		).toBeEnabled();
	},
};

/**
 * The open ticket doesn't block the screen: with one open, the call button and the other tickets
 * answer the first tap, rather than a first tap that only closes the sheet.
 */
export const ActingPastAnOpenTicket: Story = {
	args: { openVisitId: 'guest-called-1' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await (await openTicket()).findByText('Maria S.')).toBeVisible();

		await userEvent.click(
			canvas.getByRole('button', {
				name: t.openTicket.replace('{number}', '2').replace('{name}', 'Sohrab Ahmadi'),
			}),
		);

		await expect(await (await openTicket()).findByText('Sohrab A.')).toBeVisible();

		await userEvent.click(
			canvas.getByRole('button', { name: t.callNextNumber.replace('{number}', '3') }),
		);

		await expect(await (await openTicket()).findByText('Linh N.')).toBeVisible();

		await userEvent.click(canvas.getByRole('button', { name: t.closeTicket }));

		await expect(canvas.queryByRole('region', { name: t.ticket })).toBeNull();
	},
};

/**
 * Searching opens a dialog that finds tickets across the line — by name, without minding accents,
 * by the number on a ticket, or by the last digits of a phone number — and opening one puts the
 * search away.
 */
export const SearchingTheLine: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const page = within(document.body);

		await userEvent.click(await canvas.findByRole('button', { name: t.openSearch }));

		const dialog = within(await page.findByRole('dialog', { name: t.search }));
		const search = dialog.getByRole('searchbox', { name: t.search });

		await expect(search).toHaveFocus();
		// Once the dialog has faded in.
		await waitFor(() => expect(dialog.getByText(t.searchHint)).toBeVisible());

		await userEvent.type(search, 'tomas');

		await expect(
			within(dialog.getByRole('region', { name: t.notPlaced })).getByText('Tomás Rivera'),
		).toBeVisible();
		await expect(dialog.queryByText('Maria Santos')).toBeNull();

		await userEvent.clear(search);
		await userEvent.type(search, '404');

		await expect(await dialog.findByText(t.noMatches)).toBeVisible();

		await userEvent.clear(search);
		await userEvent.type(search, '4');
		await userEvent.click(
			dialog.getByRole('button', {
				name: t.openTicket.replace('{number}', '4').replace('{name}', 'Rosa Delacruz'),
			}),
		);

		// The dialog hides the screen behind it until it has faded out.
		await waitFor(() => expect(page.queryByRole('dialog', { name: t.search })).toBeNull());
		await waitFor(async () => expect((await openTicket()).getByText('Rosa D.')).toBeVisible());
	},
};

/** A section's title folds it away, keeping its count in view, and unfolds it again. */
export const FoldingASection: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const toggle = await canvas.findByRole('button', { name: new RegExp(`^${t.done}`) });

		await userEvent.click(toggle);

		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(canvas.queryByText('James Okafor')).not.toBeVisible();

		await userEvent.click(toggle);

		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(canvas.getByText('James Okafor')).toBeVisible();
	},
};

/** Everyone is through, so the call button gives its place to closing the session. */
export const EveryoneThrough: Story = {
	args: {
		guests: finishedQueue.map((guest, index) => ({
			...guest,
			queuePosition: index + 1,
			marketEventId: seededEventId,
		})),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			await canvas.findByRole('button', {
				name: adminTranslations.en.closeSession,
			}),
		).toBeVisible();
	},
};

/** A screen as wide as the check-in desk's computer, past the 860px the desk layout starts at. */
const deskViewport = { viewport: { value: 'ipad12p', isRotated: false } };

/**
 * On the check-in desk's computer, the line and the open ticket sit side by side: the ticket is a
 * pane on the page, not a sheet over it, and until one is chosen it says how to open one.
 */
export const AtTheDesk: Story = {
	globals: deskViewport,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const pane = within(await canvas.findByRole('complementary', { name: t.ticket }));

		await expect(pane.getByText(t.noTicketOpen)).toBeVisible();

		await userEvent.click(
			await canvas.findByRole('button', {
				name: t.openTicket.replace('{number}', '1').replace('{name}', 'Maria Santos'),
			}),
		);

		await expect(await pane.findByText('Maria S.')).toBeVisible();
		// The phone's sheet never opens over it.
		await expect(document.querySelector('.ticket-sheet')).toBeNull();
	},
};

/**
 * Serving the guest at the desk calls the next one, and the pane moves straight from one ticket to
 * the next.
 */
export const ServingAndCallingNextAtTheDesk: Story = {
	args: { openVisitId: 'guest-called-2' },
	globals: deskViewport,
	play: async ({ canvasElement }) => {
		const pane = within(
			await within(canvasElement).findByRole('complementary', { name: t.ticket }),
		);

		await userEvent.click(await pane.findByRole('button', { name: t.serveAndCallNext }));

		await expect(await pane.findByText('Linh N.')).toBeVisible();
	},
};

/**
 * Over a slow connection, the call button says it is calling and waits, and so does serving and
 * calling in one step — either would call a second guest — while the open ticket's other buttons
 * keep working: marking the guest served mid-call lands, and the called guest's ticket opens.
 */
export const CallingOverASlowConnectionAtTheDesk: Story = {
	args: { openVisitId: 'guest-called-2', latencyMs: 800 },
	globals: deskViewport,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const pane = within(await canvas.findByRole('complementary', { name: t.ticket }));

		await expect(await pane.findByText('Sohrab A.', {}, { timeout: 5_000 })).toBeVisible();

		await userEvent.click(
			await canvas.findByRole('button', { name: t.callNextNumber.replace('{number}', '3') }),
		);

		await expect(canvas.getByRole('button', { name: t.calling })).toBeDisabled();
		await expect(pane.getByRole('button', { name: t.serveAndCallNext })).toBeDisabled();

		await userEvent.click(pane.getByRole('button', { name: visitCommandLabels().serve }));

		await expect(await pane.findByText('Linh N.', {}, { timeout: 5_000 })).toBeVisible();

		const done = within(canvas.getByRole('region', { name: t.done }));

		// After both rereads, so a stale one can't have put Sohrab back among the called.
		await waitFor(
			async () => {
				await expect(
					canvas.getByRole('button', { name: t.callNextNumber.replace('{number}', '4') }),
				).toBeEnabled();
				await expect(done.getByText('Sohrab Ahmadi')).toBeVisible();
			},
			{ timeout: 5_000 },
		);
	},
};

/** On the desk, `/` opens the search, and Enter opens the ticket when only one matches. */
export const SearchingFromTheKeyboardAtTheDesk: Story = {
	globals: deskViewport,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const page = within(document.body);

		await canvas.findByRole('button', { name: t.openSearch });
		await userEvent.keyboard('/');

		const search = await page.findByRole('searchbox', { name: t.search });

		await userEvent.type(search, 'linh{Enter}');

		// Found once the dialog has faded out and stopped hiding the screen behind it.
		const pane = within(await canvas.findByRole('complementary', { name: t.ticket }));

		await expect(await pane.findByText('Linh N.')).toBeVisible();
	},
};

/** The last households can be recorded directly below Done without opening another screen. */
export const CountOnlyAfterTheQueue: Story = {
	args: EveryoneThrough.args,
	play: async ({ canvas }) => {
		const copy = adminTranslations.en.householdService;
		const region = await canvas.findByRole('region', { name: copy.sectionTitle });
		const done = canvas.getByRole('region', { name: t.done });

		await expect(
			done.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		const section = within(region);
		const size = section.getByRole('textbox', { name: copy.size });

		await waitFor(() => expect(size).toBeEnabled());
		await expect(size).not.toHaveFocus();
		await userEvent.click(
			section.getByRole('button', { name: adminTranslations.en.increaseNumber }),
		);
		await expect(size).toHaveValue('1');
		await expect(
			section.getByRole('button', { name: adminTranslations.en.decreaseNumber }),
		).toBeDisabled();
		await userEvent.click(
			section.getByRole('button', { name: adminTranslations.en.increaseNumber }),
		);
		await userEvent.click(
			section.getByRole('button', { name: adminTranslations.en.increaseNumber }),
		);
		await userEvent.click(
			section.getByRole('button', { name: adminTranslations.en.increaseNumber }),
		);
		await expect(size).toHaveValue('4');
		await userEvent.click(section.getByRole('button', { name: copy.queueRecord }));
		await expect(await section.findByRole('status')).toHaveTextContent(copy.queueSaved);
		await expect(size).toHaveValue('');
		await expect(size).toHaveFocus();
		await userEvent.type(size, '2');
		await userEvent.click(section.getByRole('button', { name: copy.queueRecord }));
		await expect(await section.findByText('6 people')).toBeVisible();
		await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
		await userEvent.click(
			section.getByRole('button', { name: `${copy.entryActions}: 2 ${copy.people}` }),
		);
		await userEvent.click(await within(document.body).findByRole('menuitem', { name: copy.undo }));
		await expect(await section.findByText('4 people')).toBeVisible();
	},
};

export const CountOnlyAtTheDesk: Story = {
	...CountOnlyAfterTheQueue,
	globals: deskViewport,
};
