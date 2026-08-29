import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from './Card';

/**
 * The bordered panel chrome behind the guest check-in card — padding, border, and background,
 * nothing else. `.card + .card` adds spacing when two are stacked; everything else it renders is
 * plain child content.
 */
const meta = {
	title: 'Primitives/Card',
	component: Card,
	parameters: { layout: 'centered' },
	args: {
		children: <p style={{ margin: 0 }}>Card content goes here.</p>,
		style: { width: '320px' },
	},
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
