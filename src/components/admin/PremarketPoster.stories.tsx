import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { PremarketPoster } from './PremarketPoster';

const t = adminTranslations.en.today;

const meta = {
	title: 'Admin/Today/Premarket Poster',
	component: PremarketPoster,
	// Outside the dashboard frame, like the guest poster on `/qr-code`.
	parameters: { shell: 'bare' },
} satisfies Meta<typeof PremarketPoster>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The page a worker prints for the premarket table: the code, and the address it opens. */
export const Poster: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('heading', { name: t.premarketPosterTitle })).toBeVisible();
		await expect(canvas.getByRole('img', { name: t.premarketCode })).toBeVisible();
		await expect(canvas.getByText(/\/premarket$/)).toBeVisible();
		await expect(canvas.getByRole('button', { name: t.print })).toBeVisible();
	},
};
