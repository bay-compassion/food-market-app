import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import type { Locale } from '@/locales.ts';

import { visitStatuses, type VisitStatus } from '../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import QueueGuestRow from './QueueGuestRow.vue';
import { guestWithStatus, queueGuest } from './queueGuests.fixture';

/**
 * One guest in the worker's queue.
 *
 * Which command buttons appear is decided entirely by the guest's status — `visitStateMachine.ts`
 * owns that rule, and `VisitCommandButtons` renders whatever it allows. The `EachStatus` story
 * below is the quickest way to see the whole matrix at once.
 */
type QueueGuestRowArgs = {
	locale: Locale;
	status: VisitStatus;
	showWaitingTime: boolean;
	busy: boolean;
};

const meta: Meta<QueueGuestRowArgs> = {
	title: 'Admin/QueueGuestRow',
	component: QueueGuestRow,
	parameters: { shell: 'admin' },
	argTypes: {
		status: { control: 'select', options: visitStatuses },
	},
	args: {
		locale: 'en',
		status: 'waiting',
		showWaitingTime: false,
		busy: false,
	},
	render: (args) => ({
		components: { QueueGuestRow },
		setup() {
			return {
				args,
				guest: computed(() => guestWithStatus(args.status)),
				statusLabel: computed(() => adminVisitStatusLabels(args.locale)[args.status]),
				// The row's "called N min ago" label counts up from this; a fixed value keeps the
				// story stable rather than drifting while it sits open.
				now: Date.now(),
			};
		},
		template: `
			<div class="guest-list">
				<QueueGuestRow
					:locale="args.locale"
					:guest="guest"
					:now="now"
					:status-label="statusLabel"
					:busy="args.busy"
					:show-waiting-time="args.showWaitingTime"
				/>
			</div>
		`,
	}),
};

export default meta;

type Story = StoryObj<QueueGuestRowArgs>;

/** A guest in line, offering the commands that apply to a waiting visit. */
export const Waiting: Story = {};

/** Called to the counter, with the minutes-since-called label switched on. */
export const Called: Story = {
	args: { status: 'called', showWaitingTime: true },
};

/** Registered but not yet placed in the queue. */
export const Registered: Story = {
	args: { status: 'registered' },
};

/** Finished — a resolved row offers no further commands. */
export const Served: Story = {
	args: { status: 'served' },
};

/** Every command button disabled while a request is in flight. */
export const Busy: Story = {
	args: { busy: true },
};

/**
 * A guest whose language is not the worker's. The row shows the guest's own language so a worker
 * knows to find an interpreter, which is why the fixtures deliberately span several locales.
 */
export const GuestSpeaksAnotherLanguage: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => ({
		components: { QueueGuestRow },
		setup() {
			return {
				args,
				guest: queueGuest({ firstName: 'Sohrab', lastName: 'Ahmadi', locale: 'fa' }),
				statusLabel: computed(() => adminVisitStatusLabels(args.locale).waiting),
				now: Date.now(),
			};
		},
		template: `
			<div class="guest-list">
				<QueueGuestRow
					:locale="args.locale"
					:guest="guest"
					:now="now"
					:status-label="statusLabel"
				/>
			</div>
		`,
	}),
};

/** Every status stacked, so the command matrix can be read in one pass. */
export const EachStatus: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => ({
		components: { QueueGuestRow },
		setup() {
			return {
				args,
				visitStatuses,
				rows: computed(() => visitStatuses.map((status) => guestWithStatus(status))),
				statusLabels: computed(() => adminVisitStatusLabels(args.locale)),
				now: Date.now(),
			};
		},
		template: `
			<div class="guest-list">
				<QueueGuestRow
					v-for="row in rows"
					:key="row.id"
					:locale="args.locale"
					:guest="row"
					:now="now"
					:status-label="statusLabels[row.status]"
					show-waiting-time
				/>
			</div>
		`,
	}),
};
