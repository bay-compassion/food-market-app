import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { translations, type Locale } from '../../../locales';
import {
	LINE_POSITION_INDICATOR_FLAG_KEY,
	type LinePositionIndicator,
} from '../../hooks/use-line-position-indicator';
import { StaticLDProvider } from '../../StaticLDProvider';
import GuestTour from './GuestTour';

/**
 * The guided tour a first-time guest is offered after choosing a language, and can replay from
 * the menu, where the `guest-tour` flag is on (it is off by default; `GuestView` and the menu
 * check it, so the tour itself renders here regardless). Steps whose anchor the screen does not
 * render are told centered — on their own here, that is every step; turn on the toolbar's
 * **App frame** to see the app bar steps point at it.
 */
const meta = {
	title: 'Guest/First Visit/Tour',
	component: GuestTour,
	parameters: { shell: 'guest' },
} satisfies Meta<typeof GuestTour>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {
	play: async ({ globals, userEvent }) => {
		const copy = translations[globals.locale as Locale].guestView.tour;
		const body = within(document.body);
		const dialog = await body.findByRole('alertdialog', { name: copy.steps.welcome.title });

		await expect(within(dialog).getByRole('button', { name: copy.skip })).toBeInTheDocument();

		await userEvent.click(within(dialog).getByRole('button', { name: copy.start }));

		await expect(
			await body.findByRole('alertdialog', { name: copy.steps.language.title }),
		).toBeInTheDocument();
	},
};

/** Skipping ends the tour at once, from its first step. */
export const Skipped: Story = {
	play: async ({ globals, userEvent }) => {
		const copy = translations[globals.locale as Locale].guestView.tour;
		const body = within(document.body);
		const dialog = await body.findByRole('alertdialog', { name: copy.steps.welcome.title });

		await userEvent.click(within(dialog).getByRole('button', { name: copy.skip }));

		await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
	},
};

/** Joyride portals outside `<main>`, so the tooltip sets its own direction. */
export const RightToLeft: Story = {
	globals: { locale: 'fa' },
	play: async () => {
		const copy = translations.fa.guestView.tour;
		const dialog = await within(document.body).findByRole('alertdialog', {
			name: copy.steps.welcome.title,
		});

		await expect(dialog).toHaveAttribute('dir', 'rtl');
	},
};

/** Steps from the welcome to the line step, the seventh, and returns its dialog. */
async function advanceToLineStep(
	locale: Locale,
	userEvent: { click: (element: Element) => Promise<void> },
) {
	const copy = translations[locale].guestView.tour;
	const body = within(document.body);

	await userEvent.click(await body.findByRole('button', { name: copy.start }));

	for (let step = 2; step < 7; step++) {
		await userEvent.click(await body.findByRole('button', { name: copy.next }));
	}

	return body.findByRole('alertdialog', { name: copy.steps.line.title });
}

/**
 * The line step previews the waiting card's own line display, so it follows the
 * `line-position-indicator` flag: whichever indicator a guest's screen will show is the one the
 * tour shows them. One story per variation.
 */
function linePreview(indicator: LinePositionIndicator): Story {
	return {
		decorators: [
			(Story) => (
				<StaticLDProvider flags={{ [LINE_POSITION_INDICATOR_FLAG_KEY]: indicator }}>
					<Story />
				</StaticLDProvider>
			),
		],
		play: async ({ globals, userEvent }) => {
			const locale = globals.locale as Locale;
			const waiting = translations[locale].guestView.visitStatus.waiting;
			const standing = (await advanceToLineStep(locale, userEvent)).querySelector<HTMLElement>(
				'.queue-standing',
			);

			// The preview is hidden from assistive technology, so it is found by its markup and text.
			await expect(standing).not.toBeNull();

			const preview = within(standing!);

			await expect(preview.getByText(waiting.queuePositionLabel)).toBeInTheDocument();
			await expect(preview.queryByText(waiting.guestsAheadLabel) !== null).toBe(
				indicator === 'guests-ahead',
			);
			await expect(preview.queryByText(waiting.nowCallingLabel) !== null).toBe(
				indicator === 'now-calling',
			);
		},
	};
}

export const LinePreviewGuestsAhead = linePreview('guests-ahead');
export const LinePreviewNowCalling = linePreview('now-calling');
export const LinePreviewNumberOnly = linePreview('none');
