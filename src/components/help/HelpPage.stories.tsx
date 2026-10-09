import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { HelpPage } from './HelpPage';

/**
 * The `/help` page: how a market Saturday works, step by step. It carries the same instructions as
 * the printed flyer in `public/flyers/`, so the two should change together.
 */
const meta = {
	title: 'Guest/Help',
	component: HelpPage,
	parameters: { shell: 'guest' },
} satisfies Meta<typeof HelpPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Help: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.help;

		await expect(canvas.getByRole('heading', { level: 1, name: copy.title })).toBeInTheDocument();
		await expect(canvas.getByRole('heading', { name: copy.introHeading })).toBeInTheDocument();
		await expect(canvas.getAllByRole('listitem')).toHaveLength(copy.steps.length);
		await expect(canvas.getByText(copy.phoneNotice.heading)).toBeInTheDocument();
		await expect(
			canvas.getByRole('button', { name: translations.en.backToGuest }),
		).toBeInTheDocument();
	},
};

/** Persian reads right to left and numbers its steps in its own digits. */
export const RightToLeft: Story = {
	globals: { locale: 'fa' },
	play: async ({ canvas }) => {
		const copy = translations.fa.help;

		await expect(canvas.getByRole('heading', { level: 1, name: copy.title })).toBeInTheDocument();
		await expect(canvas.getAllByRole('listitem')).toHaveLength(copy.steps.length);
	},
};
