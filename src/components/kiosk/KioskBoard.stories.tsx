import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { translations } from '../../locales';
import { QueueBoard, type QueueBoardState } from '../../models/queue-board';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';

type Args = QueueBoardState & { reconnecting: boolean };

/**
 * The `/kiosk` room display while numbers are being called — sized for a tablet or monitor read
 * from across the room, not a phone. View it full screen; the type scales with the viewport.
 */
const meta = {
	title: 'Kiosk/KioskBoard',
	parameters: { shell: 'bare', layout: 'fullscreen' },
	args: {
		sessionStatus: 'service_started',
		nowCalling: 23,
		called: [23, 21, 17, 14],
		waitingCount: 31,
		reconnecting: false,
	},
	render: ({ reconnecting, ...state }) => (
		<KioskFrame>
			<KioskBoard board={new QueueBoard(state)} reconnecting={reconnecting} />
		</KioskFrame>
	),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Earlier numbers nobody has come up for yet sit beside the one being called. */
export const WithUnclaimedNumbers: Story = {
	play: async ({ canvasElement }) => {
		const unclaimed = within(
			within(canvasElement).getByRole('region', {
				name: translations.en.kiosk.stillWaitingFor,
			}),
		);

		// Most recently called first.
		await expect(unclaimed.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			'21',
			'17',
			'14',
		]);
	},
};

/** More unclaimed numbers than the panel holds: the newest that fit, then one tile for the rest. */
export const MoreThanFit: Story = {
	args: {
		nowCalling: 60,
		called: Array.from({ length: 30 }, (_, index) => 60 - index),
	},
	play: async ({ canvasElement }) => {
		const items = within(
			within(canvasElement).getByRole('region', {
				name: translations.en.kiosk.stillWaitingFor,
			}),
		).getAllByRole('listitem');
		const more = items.at(-1)!;
		const numbers = items.slice(0, -1).map((item) => Number(item.textContent));
		const hidden = 29 - numbers.length;

		await expect(more).toHaveTextContent(
			translations.en.kiosk.moreCount.replace('{count}', String(hidden)),
		);
		// The newest unclaimed numbers stay; the oldest fold into the tile.
		await expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, index) => 59 - index));
		// Nothing spills past the panel's bottom edge.
		const list = more.parentElement!;

		await expect(more.offsetTop + more.offsetHeight).toBeLessThanOrEqual(list.clientHeight);
	},
};

/** Everyone called has come to the table: the number being called fills the screen alone. */
export const AllClaimed: Story = {
	args: { called: [23] },
};

/** Service has started but nobody has been called yet. */
export const NothingCalledYet: Story = {
	args: { nowCalling: null, called: [], waitingCount: 40 },
};

/** The latest read failed; the last good board stays up with a note in the footer. */
export const Reconnecting: Story = {
	args: { reconnecting: true },
};

/** Every state that is not a queue being called is one sentence filling the display. */
export const BeforeTheMarketOpens: Story = {
	render: () => (
		<KioskFrame>
			<KioskMessage message={translations.en.kiosk.notStarted} />
		</KioskFrame>
	),
};
