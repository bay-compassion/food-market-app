import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { admissionsFor, type GuestAdmission } from '../../services/guestAdmission';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { busyQueue, busyQueueCounts, queueGuest } from './queueGuests.fixture';
import { QueueView } from './QueueView';
import type { QueueGuest } from './types';

/**
 * The screen a worker runs the market from.
 *
 * This is the one screen used on a phone for a whole service, so the stories are worth checking at
 * the default mobile viewport: the call-next control and the first called guest need to clear the
 * fold. `serviceStarted` is the big fork — before service begins the screen is only a pointer back
 * to the session setup.
 */
type QueueViewArgs = {
	locale: Locale;
	serviceStarted: boolean;
	busy: boolean;
	admissions: GuestAdmission[];
	guests: QueueGuest[];
	counts: Partial<Record<string, number>>;
};

function Queue({ locale, serviceStarted, busy, admissions, guests, counts }: QueueViewArgs) {
	return (
		<QueueView
			guests={guests}
			counts={counts}
			statusLabels={adminVisitStatusLabels(locale)}
			serviceStarted={serviceStarted}
			admissions={admissions}
			busy={busy}
			onCallNext={fn()}
			onRun={fn()}
			onAddGuest={fn()}
			onCloseSession={fn()}
			onNavigateCurrentSession={fn()}
		/>
	);
}

const meta = {
	title: 'Admin/QueueView',
	component: Queue,
	parameters: { shell: 'admin' },
	args: {
		locale: 'en',
		serviceStarted: true,
		busy: false,
		// What a session in service actually offers: the draw has run, so only a place in line.
		admissions: admissionsFor('service_started'),
		guests: busyQueue,
		counts: busyQueueCounts,
	},
} satisfies Meta<typeof Queue>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Service under way: guests called, guests waiting, and a few already resolved. */
export const DuringService: Story = {};

/**
 * Service has not started. The queue is deliberately a dead end here — the only thing offered is
 * a way back to the session screen where service is actually started.
 */
export const BeforeServiceStarts: Story = {
	args: { serviceStarted: false },
};

/** An empty queue: both the called and waiting sections fall back to their empty states. */
export const EmptyQueue: Story = {
	args: { guests: [], counts: {} },
};

/** Nobody called yet — everyone is still waiting to be drawn. */
export const NobodyCalledYet: Story = {
	args: {
		guests: [1, 2, 3, 4].map((position) =>
			queueGuest({ id: `guest-${position}`, queuePosition: position }),
		),
		counts: { waiting: 4 },
	},
};

/** Every control disabled while a command is in flight. */
export const Busy: Story = {
	args: { busy: true },
};

/**
 * A list folded away. Every list starts open; a worker who never uses one — the finished list,
 * say — can collapse it for the rest of the service.
 */
export const SectionCollapsed: Story = {
	play: async ({ canvas, userEvent }) => {
		// Matched against the translation rather than a hard-coded string, so rewording the heading in
		// `adminLocales.ts` does not quietly break this story.
		const label = new RegExp(adminTranslations.en.resolvedGuests, 'i');

		await userEvent.click(await canvas.findByRole('button', { name: label }));
	},
};

/** The menu behind a row's dots: the rarer transitions and the guest's phone number. */
export const RowMenuOpen: Story = {
	play: async ({ canvas, userEvent }) => {
		const label = new RegExp(adminTranslations.en.moreActions, 'i');

		await userEvent.click((await canvas.findAllByRole('button', { name: label }))[0]!);
	},
};

/** The session menu in the header, where closing the session lives as a destructive action. */
export const SessionMenuOpen: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole('button', { name: adminTranslations.en.sessionActions }),
		);
	},
};

/** Adding a guest by hand: the form opens at the top of the waiting list. */
export const AddingGuest: Story = {
	play: async ({ canvas, userEvent }) => {
		const label = new RegExp(adminTranslations.en.addGuest, 'i');

		await userEvent.click(await canvas.findByRole('button', { name: label }));
	},
};

/** In Spanish, the language a large share of guests and several workers use. */
export const Spanish: Story = {
	globals: { locale: 'es' },
};
