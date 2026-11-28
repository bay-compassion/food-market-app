import type { Meta, StoryObj } from '@storybook/react-vite';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import { translations } from '../../locales';
import type { StandbyTicketResult } from '../../services/standby';
import { useRootStore } from '../../stores/react/store-context';
import { StandbyEntryStore } from '../../stores/standby-entry.store';
import { StandbyForm } from './StandbyForm';
import { StandbyStatusMessage } from './StandbyStatusMessage';

/**
 * Where the standby iPads' QR code lands at the market. The route (`StandbyPage`) pulls a ticket for
 * the scanned code; these are what the guest sees. A story hands the entry store its answer and its
 * own storage directly rather than faking `fetch` or `localStorage`, which a docs page would share
 * between every story on it.
 */
type Args = { result: StandbyTicketResult['kind'] | 'checking' };

const copy = translations.en.standby;

const ticket = {
	code: 'story-session.story-signature',
	ticket: 'story-ticket-that-is-long-enough-to-be-real-1234',
	standbyNumber: 7,
	marketEventId: 'story-session',
};

const Standby = observer(function Standby({ result }: Args) {
	const { guest, registration, visit } = useRootStore();
	const [entry] = useState(() => {
		const saved = new Map<string, string>();
		const created = new StandbyEntryStore({
			registration,
			visit,
			guest,
			pullTicket: (): Promise<StandbyTicketResult> =>
				result === 'checking'
					? new Promise(() => undefined)
					: Promise.resolve(result === 'ticket' ? { kind: 'ticket', ticket } : { kind: result }),
			storage: {
				getItem: (key) => saved.get(key) ?? null,
				setItem: (key, value) => void saved.set(key, value),
				removeItem: (key) => void saved.delete(key),
			},
		});

		void created.start(ticket.code);

		return created;
	});

	return entry.state === 'held' ? (
		<StandbyForm entry={entry} />
	) : entry.state === 'joined' ? null : (
		<StandbyStatusMessage state={entry.state} onRetry={() => void entry.start(ticket.code)} />
	);
});

const meta = {
	title: 'Guest/Other Pages/Standby',
	component: Standby,
	parameters: { shell: 'guest' },
	args: { result: 'ticket' },
	argTypes: {
		result: {
			control: 'select',
			options: ['ticket', 'checking', 'not_open', 'closed', 'invalid', 'unreachable'],
		},
	},
} satisfies Meta<typeof Standby>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Scanned once standby opened: their place is held as S7 while they fill in their details. */
export const PlaceHeld: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('heading', { name: copy.title })).toBeInTheDocument();
		await expect(canvas.getByText('S7')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: copy.submit })).toBeInTheDocument();
		await expect(canvas.getByText(copy.householdLegend)).toBeInTheDocument();
	},
};

export const Checking: Story = {
	args: { result: 'checking' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole('status')).toHaveTextContent(copy.checking);
	},
};

/** Scanned before the first number was called. */
export const NotOpenYet: Story = {
	args: { result: 'not_open' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText(copy.notOpenHeading)).toBeInTheDocument();
	},
};

export const Closed: Story = {
	args: { result: 'closed' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText(copy.closedHeading)).toBeInTheDocument();
	},
};

export const InvalidCode: Story = {
	args: { result: 'invalid' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText(copy.invalidHeading)).toBeInTheDocument();
	},
};

export const Unreachable: Story = {
	args: { result: 'unreachable' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText(copy.unreachableHeading)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: copy.retry })).toBeInTheDocument();
	},
};
