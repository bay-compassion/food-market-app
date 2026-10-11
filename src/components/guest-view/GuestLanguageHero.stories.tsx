import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import { GuestLanguageHero } from './GuestLanguageHero';

/**
 * The one-time introduction a first-time visitor sees above the home screen. `GuestView` stops
 * rendering it once a language is chosen; on its own here it stays put, so a choice only changes
 * the language. Turn on the toolbar's **App frame** to see the app bar picker it folds into.
 */
const meta = {
	title: 'Guest/Language Introduction',
	component: GuestLanguageHero,
	parameters: { shell: 'guest' },
} satisfies Meta<typeof GuestLanguageHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstVisit: Story = {
	play: async ({ canvas, userEvent, globals }) => {
		const t = translations[globals.locale as Locale];

		await expect(canvas.getByText(t.guestView.languageHint)).toBeInTheDocument();

		const group = canvas.getByRole('group', { name: t.languagePrompt });
		const spanish = translations.es;

		await userEvent.click(canvas.getByRole('button', { name: 'Español' }));

		// The choice lands once the view transition has captured the page, a frame or so later.
		await waitFor(() =>
			expect(canvas.getByRole('button', { name: 'Español' })).toHaveAttribute(
				'aria-pressed',
				'true',
			),
		);
		await expect(canvas.getByText(spanish.guestView.languageHint)).toBeInTheDocument();
		await expect(group).toHaveAccessibleName(spanish.languagePrompt);
	},
};
