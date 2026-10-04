import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import { QueueBoard, type QueueBoardState } from '../../models/queue-board';
import { QueueNumerals } from '../../services/queue-numerals';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';

type Args = QueueBoardState & { reconnecting: boolean; locale: Locale };

/**
 * The `/kiosk` room display while numbers are being called — sized for a tablet or monitor read
 * from across the room, not a phone. View it full screen; the type scales with the viewport.
 *
 * The real display rotates its language on its own clock; here the toolbar's locale picks one, so
 * each language's longest copy can be checked against the layout.
 */
const meta = {
	title: 'Kiosk/KioskBoard',
	parameters: { shell: 'bare', layout: 'fullscreen' },
	args: {
		locale: 'en',
		sessionStatus: 'service_started',
		nowCalling: 23,
		called: [23, 21, 17, 14],
		waitingCount: 31,
		reconnecting: false,
	},
	render: ({ reconnecting, locale, ...state }) => (
		<KioskFrame dir="ltr" lang={locale}>
			<KioskBoard
				board={new QueueBoard(state)}
				translation={translations[locale]}
				numerals={new QueueNumerals(locale)}
				reconnecting={reconnecting}
			/>
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

/** In Arabic, every queue number is written twice: Western digits above Eastern Arabic ones. */
export const ArabicNumerals: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('٢٣')).toBeInTheDocument();
		await expect(canvas.getByText('٢١')).toBeInTheDocument();
	},
};

/** Farsi's own digits differ from Arabic's for 4, 5, and 6, so it gets its own set. */
export const FarsiNumerals: Story = {
	globals: { locale: 'fa' },
	args: { nowCalling: 45, called: [56, 45, 14] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('۴۵')).toBeInTheDocument();
		await expect(canvas.getByText('۵۶')).toBeInTheDocument();
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
