import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { Locale } from '../../locales';
import { visitStatuses, type VisitStatus } from '../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { QueueGuestRow } from './QueueGuestRow';
import { guestWithStatus, queueGuest } from './queueGuests.fixture';
import { QueueGuestTable } from './QueueGuestTable';

/**
 * One guest in the worker's queue.
 *
 * Which commands a row offers is decided entirely by the guest's status — `visitStateMachine.ts`
 * owns that rule. `QueueGuestActions` shows the likely next step as the one visible button and
 * folds the rest, plus a tap-to-dial phone number, into the menu behind the dots. The `EachStatus`
 * story below is the quickest way to see the whole matrix at once.
 */
type QueueGuestRowArgs = {
	locale: Locale;
	status: VisitStatus;
	showWaitingTime: boolean;
	busy: boolean;
};

/** The row's "called N min ago" label counts up from this; a fixed value keeps the story stable
 *  rather than drifting while it sits open. */
const now = Date.now();

function OneRow({ status, showWaitingTime, busy }: QueueGuestRowArgs) {
	return (
		<QueueGuestTable label="Queue">
			<QueueGuestRow
				guest={guestWithStatus(status)}
				now={now}
				busy={busy}
				showWaitingTime={showWaitingTime}
				onRun={fn()}
			/>
		</QueueGuestTable>
	);
}

const meta = {
	title: 'Admin/QueueGuestRow',
	component: OneRow,
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
} satisfies Meta<typeof OneRow>;

export default meta;

type Story = StoryObj<typeof meta>;

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

/**
 * Finished. A served row has no command left, so only the phone number remains behind the dots;
 * the chip is what the finished list passes in, since that list mixes several statuses.
 */
export const Served: Story = {
	parameters: { controls: { disable: true } },
	render: ({ locale }) => (
		<QueueGuestTable label="Queue">
			<QueueGuestRow
				guest={guestWithStatus('served')}
				now={now}
				statusLabel={adminVisitStatusLabels(locale).served}
				onRun={fn()}
			/>
		</QueueGuestTable>
	),
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
	render: () => (
		<QueueGuestTable label="Queue">
			<QueueGuestRow
				guest={queueGuest({
					firstName: 'Sohrab',
					lastName: 'Ahmadi',
					locale: 'fa',
				})}
				now={now}
				onRun={fn()}
			/>
		</QueueGuestTable>
	),
};

/** Every status stacked, so the command matrix can be read in one pass. */
export const EachStatus: Story = {
	parameters: { controls: { disable: true } },
	render: ({ locale }) => {
		const statusLabels = adminVisitStatusLabels(locale);

		return (
			<QueueGuestTable label="Queue">
				{visitStatuses.map((status) => {
					const row = guestWithStatus(status);

					return (
						<QueueGuestRow
							key={row.id}
							guest={row}
							now={now}
							statusLabel={statusLabels[row.status]}
							showWaitingTime
							onRun={fn()}
						/>
					);
				})}
			</QueueGuestTable>
		);
	},
};
