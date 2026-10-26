import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';

import { languages, translations } from '../../locales';
import { HoldingPage } from './HoldingPage';

const meta = {
	title: 'Guest/Other Pages/Holding Page',
	component: HoldingPage,
	parameters: { shell: 'bare' },
	decorators: [
		(Story) => (
			<div style={{ margin: -24 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof HoldingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComingSoon: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.holdingPage;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.instructions)).toBeInTheDocument();
		await expect(canvas.getByRole('link', { name: copy.currentAppLink })).toHaveAttribute(
			'href',
			'https://qrq.app/107352',
		);
		await expect(
			canvas.getAllByRole('link', { name: translations.en.help.title })[0],
		).toHaveAttribute('href', '/help');
		await expect(canvas.getByRole('link', { name: translations.en.marketName })).toHaveAttribute(
			'href',
			'/holding',
		);
		await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
		await expect(
			canvas.getByRole('button', { name: translations.en.guestView.presentation.watch }),
		).toBeInTheDocument();

		for (const { code, label } of languages) {
			await expect(canvas.getByRole('button', { name: label })).toHaveAttribute(
				'aria-pressed',
				String(code === 'en'),
			);
		}
	},
};

export const ChangeLanguage: Story = {
	play: async ({ canvas }) => {
		for (const { code, label } of languages) {
			await userEvent.click(canvas.getByRole('button', { name: label }));
			const copy = translations[code].holdingPage;

			await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
			await expect(canvas.getByText(copy.instructions)).toBeInTheDocument();
			await expect(canvas.getByRole('button', { name: label })).toHaveAttribute(
				'aria-pressed',
				'true',
			);
			await expect(canvas.getByRole('main')).toHaveAttribute('lang', code);
			await expect(canvas.getByRole('main')).toHaveAttribute(
				'dir',
				code === 'ar' || code === 'fa' ? 'rtl' : 'ltr',
			);
		}
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
