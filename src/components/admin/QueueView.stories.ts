import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { type AdminLocale, adminTranslations } from '../../adminLocales';
import { guestAdmissions, type GuestAdmission } from '../../services/guestAdmission';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { busyQueue, busyQueueCounts, queueGuest } from './queueGuests.fixture';
import QueueView from './QueueView.vue';

/**
 * The screen a worker runs the market from.
 *
 * This is the one screen used on a phone for a whole service, so the stories are worth checking at
 * the default mobile viewport: the call-next control and the first called guest need to clear the
 * fold. `serviceStarted` is the big fork — before service begins the screen is only a pointer back
 * to the session setup.
 */
type QueueViewArgs = {
	locale: AdminLocale;
	serviceStarted: boolean;
	busy: boolean;
	admissions: GuestAdmission[];
};

const meta: Meta<QueueViewArgs> = {
	title: 'Admin/QueueView',
	component: QueueView,
	parameters: { shell: 'admin' },
	args: {
		locale: 'en',
		serviceStarted: true,
		busy: false,
		admissions: guestAdmissions,
	},
	render: (args) => ({
		components: { QueueView },
		setup() {
			return {
				args,
				guests: busyQueue,
				counts: busyQueueCounts,
				statusLabels: computed(() => adminVisitStatusLabels(args.locale)),
			};
		},
		template: `
			<QueueView
				:locale="args.locale"
				:guests="guests"
				:counts="counts"
				:status-labels="statusLabels"
				:service-started="args.serviceStarted"
				:admissions="args.admissions"
				:busy="args.busy"
			/>
		`,
	}),
};

export default meta;

type Story = StoryObj<QueueViewArgs>;

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
	render: (args) => ({
		components: { QueueView },
		setup() {
			return {
				args,
				statusLabels: computed(() => adminVisitStatusLabels(args.locale)),
			};
		},
		template: `
			<QueueView
				:locale="args.locale"
				:guests="[]"
				:counts="{}"
				:status-labels="statusLabels"
				:service-started="args.serviceStarted"
				:admissions="args.admissions"
				:busy="args.busy"
			/>
		`,
	}),
};

/** Nobody called yet — everyone is still waiting to be drawn. */
export const NobodyCalledYet: Story = {
	render: (args) => ({
		components: { QueueView },
		setup() {
			const guests = [1, 2, 3, 4].map((position) =>
				queueGuest({ id: `guest-${position}`, queuePosition: position }),
			);

			return {
				args,
				guests,
				counts: { waiting: guests.length },
				statusLabels: computed(() => adminVisitStatusLabels(args.locale)),
			};
		},
		template: `
			<QueueView
				:locale="args.locale"
				:guests="guests"
				:counts="counts"
				:status-labels="statusLabels"
				:service-started="args.serviceStarted"
				:admissions="args.admissions"
				:busy="args.busy"
			/>
		`,
	}),
};

/** Every control disabled while a command is in flight. */
export const Busy: Story = {
	args: { busy: true },
};

/**
 * The resolved section expanded. It is collapsed by default because it only grows over a service
 * and would otherwise push the working part of the screen off a phone.
 */
export const ResolvedGuestsShown: Story = {
	play: async ({ canvas, userEvent }) => {
		// Matched against the translation rather than a hard-coded string, so rewording the label in
		// `adminLocales.ts` does not quietly break this story.
		const label = new RegExp(adminTranslations.en.showResolved, 'i');

		await userEvent.click(await canvas.findByRole('button', { name: label }));
	},
};

/** In Spanish, the language a large share of guests and several workers use. */
export const Spanish: Story = {
	globals: { locale: 'es' },
};
