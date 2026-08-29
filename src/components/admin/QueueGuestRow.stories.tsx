import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { Locale } from '../../locales';
import { visitStatuses, type VisitStatus } from '../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { QueueGuestRow } from './QueueGuestRow';
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

/** The row's "called N min ago" label counts up from this; a fixed value keeps the story stable
 *  rather than drifting while it sits open. */
const now = Date.now();

function OneRow({ locale, status, showWaitingTime, busy }: QueueGuestRowArgs) {
	return (
		<div className="guest-list">
			<QueueGuestRow
				guest={guestWithStatus(status)}
				now={now}
				statusLabel={adminVisitStatusLabels(locale)[status]}
				busy={busy}
				showWaitingTime={showWaitingTime}
				onRun={fn()}
			/>
		</div>
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
	render: ({ locale }) => (
		<div className="guest-list">
			<QueueGuestRow
				guest={queueGuest({ firstName: 'Sohrab', lastName: 'Ahmadi', locale: 'fa' })}
				now={now}
				statusLabel={adminVisitStatusLabels(locale).waiting}
				onRun={fn()}
			/>
		</div>
	),
};

/** Every status stacked, so the command matrix can be read in one pass. */
export const EachStatus: Story = {
	parameters: { controls: { disable: true } },
	render: ({ locale }) => {
		const statusLabels = adminVisitStatusLabels(locale);

		return (
			<div className="guest-list">
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
			</div>
		);
	},
};
