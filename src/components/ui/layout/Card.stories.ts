import type { Meta, StoryObj } from '@storybook/vue3-vite';

import Card from './Card.vue';

/**
 * The bordered panel chrome behind the guest check-in card — padding, border, and background,
 * nothing else. `GuestSignupCard` composes this with a `.checkin-card` class (a scoping hook
 * `guest.css` targets for its descendant rules); everything else it renders is plain slot content.
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
