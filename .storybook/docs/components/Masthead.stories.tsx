import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { MastheadProps } from '../types';
import { Masthead } from './Masthead';

/**
 * The title block at the top of a docs page. It is a story rather than JSX written into each MDX
 * file for the same reason as the token specimens: `npm run test:storybook` covers it. `!dev` keeps
 * it out of the sidebar, since it only means anything at the top of the page it introduces.
 */
const meta: Meta<MastheadProps> = {
	title: 'Design System/Masthead',
	component: Masthead,
	tags: ['!dev'],
	parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<MastheadProps>;

export const WithSubtitle: Story = {
	args: { title: 'Review Document', subtitle: 'Guest Views' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Review Document');
		await expect(canvas.getByRole('img', { name: 'The Bay Compassion' })).toBeVisible();
		await expect(canvas.getByText('Guest Views')).toBeVisible();
	},
};

export const TitleOnly: Story = {
	args: { title: 'Design System' },
};
