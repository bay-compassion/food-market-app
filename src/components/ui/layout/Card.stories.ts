import type { Meta, StoryObj } from '@storybook/vue3-vite';

import Card from './Card.vue';

/**
 * The bordered panel chrome behind the guest check-in card — padding, border, and background,
 * nothing else. `.card + .card` adds spacing when two are stacked; everything else it renders is
 * plain slot content.
 */

const meta: Meta = {
	title: 'Primitives/Card',
	component: Card,
	parameters: { layout: 'centered' },
	render: () => ({
		components: { Card },
		template: `
			<Card style="width: 320px;">
				<p style="margin: 0;">Card content goes here.</p>
			</Card>
		`,
	}),
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
