import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';

import { languages, translations } from '../../locales';
import { HoldingPage } from './HoldingPage';

const meta = {
	title: 'Guest/Holding Page',
	component: HoldingPage,
	parameters: { shell: 'bare' },
} satisfies Meta<typeof HoldingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComingSoon: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.holdingPage;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.instructions)).toBeInTheDocument();
		await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
		await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
		await expect(canvas.getAllByRole('option')).toHaveLength(languages.length);
	},
};

export const ChangeLanguage: Story = {
	play: async ({ canvas }) => {
		await userEvent.selectOptions(canvas.getByRole('combobox'), 'es');

		await expect(
			canvas.getByRole('heading', { name: translations.es.holdingPage.heading }),
		).toBeInTheDocument();
		await expect(canvas.getByText(translations.es.holdingPage.instructions)).toBeInTheDocument();
	},
};

export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('main')).toHaveAttribute('dir', 'rtl');
		await expect(canvas.getByRole('main')).toHaveAttribute('lang', 'ar');
		await expect(
			canvas.getByRole('heading', { name: translations.ar.holdingPage.heading }),
		).toBeInTheDocument();
	},
};
