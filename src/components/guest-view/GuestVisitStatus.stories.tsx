import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { translations } from '../../locales';
import {
	defaultVisitStatusArgs,
	SeededVisitStatus,
	visitStatusArgTypes,
	withIndicator,
} from './SeededVisitStatus.fixture';

/**
 * What a guest sees once they have a current visit, in every status it can be in, with the
 * `line-position-indicator` flag at `now-calling` — the guest's number on the board, and the number
 * being called under it. That is the design; the flag's other options are kept as fallbacks and
 * have their own section, `Guest/Visit/Guests Ahead (Flagged)`.
 *
 * See `SeededVisitStatus.fixture.tsx` for how each story seeds its own store.
 */
const meta = {
	title: 'Guest/Visit/Status',
	component: SeededVisitStatus,
	parameters: { shell: 'guest' },
	// Pinned rather than left to the flag's default, so these stay the primary design if it changes.
	decorators: withIndicator('now-calling'),
	argTypes: visitStatusArgTypes,
	args: defaultVisitStatusArgs,
} satisfies Meta<typeof SeededVisitStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Registered for today, before the lottery or queue has placed the guest. */
export const Registered: Story = {
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(translations.en.guestView.visitStatus.registered.header),
		).toBeInTheDocument();
		await expect(canvas.getByText(translations.en.registrationClosesIn)).toBeInTheDocument();
	},
};

/** In line: the guest's number on the board, and under it the number the market is calling, for
 *  them to compare with their own. */
export const Waiting: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 4, nowCalling: 3 },
	play: async ({ canvas }) => {
		const board = within(await canvas.findByRole('status'));

		await expect(
			board.getByText(translations.en.guestView.visitStatus.waiting.nowCallingLabel),
		).toBeInTheDocument();
		await expect(board.getByText('3')).toBeInTheDocument();
	},
};

/** Before anyone has been called, the row says so rather than showing a blank. */
export const WaitingNoneCalledYet: Story = {
	args: { visitStatus: 'waiting', queuePosition: 2, aheadOfYou: 1, nowCalling: null },
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(translations.en.guestView.visitStatus.waiting.nowCallingNone),
		).toBeInTheDocument();
	},
};

/** Called to the entrance — the one state that turns the panel into an "it's your turn" message.
 *  The stamp under the heading — a blinking dot, the guest's name, and today's date — is what
 *  the check-in worker reads to tell a live screen for today from a screenshot. */
export const Called: Story = {
	args: { visitStatus: 'called', queuePosition: 42, nowCalling: 42, called: [42] },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText('Ada L')).toBeInTheDocument();
		// The number stays on the card, for the worker at the entrance to check.
		await expect(canvas.getAllByText('42')).toHaveLength(2);
	},
};

/** Called a little while ago: the market has called on two numbers past theirs, and the board is
 *  part way to yellow. A screen reader hears the count instead. */
export const CalledRunningLate: Story = {
	args: { visitStatus: 'called', queuePosition: 42, nowCalling: 44, called: [44, 43, 42] },
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(
				translations.en.guestView.visitStatus.called.sinceYoursOther.replace('{count}', '2'),
			),
		).toBeInTheDocument();
	},
};

/** Five or more numbers past theirs: the board is fully yellow, and stays so. */
export const CalledWellBehind: Story = {
	args: { visitStatus: 'called', queuePosition: 42, nowCalling: 47, called: [47, 46, 45, 42] },
};

/** Cancelling is in flight, so the cancel button is disabled. */
export const Cancelling: Story = {
	args: {
		visitStatus: 'waiting',
		queuePosition: 3,
		aheadOfYou: 2,
		nowCalling: 1,
		isCancelling: true,
	},
};

/** The visit is over. There is nothing left to cancel. */
export const Served: Story = {
	args: { visitStatus: 'served' },
};

/** The guest was not drawn in the lottery. */
export const NotPlaced: Story = {
	args: { visitStatus: 'not_placed' },
};

/** A worker marked the guest absent, but may still return them to the queue. */
export const NoShow: Story = {
	args: { visitStatus: 'no_show' },
};

/** The guest cancelled their own visit. */
export const Cancelled: Story = {
	args: { visitStatus: 'cancelled' },
};

/** A failed cancel request. The error sits above the cancel button. */
export const CancelFailed: Story = {
	args: {
		visitStatus: 'waiting',
		queuePosition: 3,
		aheadOfYou: 2,
		nowCalling: 1,
		submissionError: true,
	},
};

/** A worker called a batch: the rest of it sits outlined beside the number the market has reached,
 *  which is the one to compare against. */
export const WaitingBatchCalled: Story = {
	args: {
		visitStatus: 'waiting',
		queuePosition: 42,
		aheadOfYou: 4,
		nowCalling: 38,
		called: [38, 37, 36],
	},
	play: async ({ canvas }) => {
		const board = within(await canvas.findByRole('status'));

		await expect(board.getByText('38')).toBeInTheDocument();
		await expect(board.getByText('36')).toBeInTheDocument();
		await expect(board.getByText('37')).toBeInTheDocument();
	},
};

/** A guest a worker put at the front is being called: their priority number sits beside the main
 *  one, which keeps counting up for everyone comparing theirs with it. */
export const WaitingPriorityCalled: Story = {
	args: {
		visitStatus: 'waiting',
		queuePosition: 42,
		aheadOfYou: 4,
		nowCalling: 38,
		called: [38],
		calledPriority: [1],
	},
	play: async ({ canvas }) => {
		const board = within(await canvas.findByRole('status'));

		await expect(board.getByText('38')).toBeInTheDocument();
		await expect(board.getByText('P1')).toBeInTheDocument();
	},
};

/** The guest a worker put at the front: their number is in the priority series. */
export const WaitingWithPriorityNumber: Story = {
	args: {
		visitStatus: 'waiting',
		queuePosition: null,
		priorityNumber: 1,
		aheadOfYou: 0,
		nowCalling: 38,
	},
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(translations.en.guestView.visitStatus.yourNumberLabel),
		).toBeInTheDocument();
		await expect(canvas.getByText('P1')).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 4, nowCalling: 3 },
	globals: { locale: 'ar' },
	/**
	 * Opens the cancel confirmation and leaves the visit alone. This covers the sheet reaching the
	 * seeded store at all — one mounted outside this story's provider would leave `ask()` waiting
	 * forever, with nothing on screen to say so — and that the question arrives in Arabic.
	 */
	play: async ({ canvas, userEvent }) => {
		const copy = translations.ar.guestView.visitStatus;

		await userEvent.click(await canvas.findByRole('button', { name: copy.cancelAction }));

		const sheet = within(await within(document.body).findByRole('alertdialog'));

		await expect(sheet.getByRole('heading', { name: copy.cancelConfirmation })).toBeInTheDocument();
		await userEvent.click(sheet.getByRole('button', { name: copy.cancelDismiss }));
	},
};
