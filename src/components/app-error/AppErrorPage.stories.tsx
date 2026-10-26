import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { AppErrorBoundary } from './AppErrorBoundary';
import { AppErrorPage } from './AppErrorPage';

const meta = {
	title: 'Guest/Other Pages/Error Page',
	component: AppErrorPage,
	parameters: { shell: 'bare' },
	decorators: [
		(Story) => (
			<div style={{ margin: -24 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof AppErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SomethingWentWrong: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.appError;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.description)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: copy.reload })).toBeInTheDocument();
	},
};

export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('main')).toHaveAttribute('dir', 'rtl');
		await expect(canvas.getByRole('main')).toHaveAttribute('lang', 'ar');
		await expect(
			canvas.getByRole('heading', { name: translations.ar.appError.heading }),
		).toBeInTheDocument();
	},
};

function Crashing(): never {
	throw new TypeError('toSorted is not a function');
}

/** A screen that throws while rendering is replaced by the page, not by a blank screen. */
export const CaughtByBoundary: Story = {
	render: () => (
		<AppErrorBoundary>
			<Crashing />
		</AppErrorBoundary>
	),
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.en.appError.heading }),
		).toBeInTheDocument();
	},
};
