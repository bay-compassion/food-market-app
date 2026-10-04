import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect, within } from 'storybook/test';

import { languages, translations, type Locale } from '../../locales';
import { QueueBoard, type QueueBoardState } from '../../models/queue-board';
import { KioskLanguage, KioskLanguagesProvider } from './kiosk-languages';
import { KioskBoard } from './KioskBoard';
import { KioskFrame, KioskMessage } from './KioskFrame';

type Args = QueueBoardState & { reconnecting: boolean; secondary: Locale };

const rotation = languages.map(({ code }) => code).filter((code) => code !== 'en');

/** The display as `/kiosk` frames it, with `locale` as the second language — English alone for `en`. */
function Display({ locale, children }: { locale: Locale; children: ReactNode }) {
	return (
		<KioskLanguagesProvider
			value={{
				primary: new KioskLanguage('en'),
				secondary: locale === 'en' ? null : new KioskLanguage(locale),
				rotation: locale === 'en' ? [] : rotation,
			}}
		>
			<KioskFrame dir="ltr" lang="en">
				{children}
			</KioskFrame>
		</KioskLanguagesProvider>
	);
}

/**
 * The `/kiosk` room display while numbers are being called — sized for a tablet or monitor read
 * from across the room, not a phone. View it full screen; the type scales with the viewport.
 *
 * Every line is English with a second language under it. The real display rotates the second one
 * on its own clock; here the `secondary` control picks it (English shows English alone, as
 * `?lang=en` does), so each language's longest copy can be checked against the layout. It is its
 * own control rather than the toolbar's locale, which the preview feeds into any `locale` arg.
 */
const meta = {
	title: 'Kiosk/KioskBoard',
	parameters: { shell: 'bare', layout: 'fullscreen' },
	argTypes: { secondary: { control: 'select', options: languages.map(({ code }) => code) } },
	args: {
		secondary: 'es',
		sessionStatus: 'service_started',
		nowCalling: 23,
		called: [23, 21, 17, 14],
		waitingCount: 31,
		reconnecting: false,
	},
	render: ({ reconnecting, secondary, ...state }) => (
		<Display locale={secondary}>
			<KioskBoard board={new QueueBoard(state)} reconnecting={reconnecting} />
		</Display>
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
	args: { secondary: 'ar' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('٢٣')).toBeInTheDocument();
		await expect(canvas.getByText('٢١')).toBeInTheDocument();
	},
};

/** Farsi's own digits differ from Arabic's for 4, 5, and 6, so it gets its own set. */
export const FarsiNumerals: Story = {
	args: { secondary: 'fa', nowCalling: 45, called: [56, 45, 14] },
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
	render: ({ secondary }) => (
		<Display locale={secondary}>
			<KioskMessage message={(copy) => copy.notStarted} />
		</Display>
	),
};

/** The row of language names along the bottom fills in the one showing now. */
export const LanguageIndicator: Story = {
	args: { secondary: 'vi' },
	play: async ({ canvasElement }) => {
		const active = canvasElement.querySelector('ol [data-active]');

		await expect(active).toHaveTextContent(languages.find(({ code }) => code === 'vi')!.label);
		// English is always on screen, so it is not one of the turns.
		await expect(canvasElement.querySelectorAll('ol li')).toHaveLength(languages.length - 1);
	},
};

/** Pinned to English (`?lang=en`): one language, no second line, no indicator. */
export const EnglishOnly: Story = {
	args: { secondary: 'en' },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('[lang="es"]')).toBeNull();
		await expect(canvasElement.querySelector('ol')).toBeNull();
		await expect(within(canvasElement).getByText(translations.en.kiosk.nowCalling)).toBeVisible();
	},
};
