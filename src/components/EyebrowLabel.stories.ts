import type { Meta, StoryObj } from '@storybook/vue3-vite';

import EyebrowLabel from './EyebrowLabel.vue';

type EyebrowLabelArgs = {
	tone: 'on-brand' | 'brand';
	label: string;
};

/**
 * The small rule-and-caption that sits above a heading.
 *
 * The two tones exist because the label appears on both backgrounds: `on-brand` is white, for the
 * dark brand hero, and `brand` is dark, for the white admin page. Each story therefore renders on
 * the background its tone is meant for — `on-brand` shown on white would be invisible.
 */
const meta: Meta<EyebrowLabelArgs> = {
	title: 'Primitives/EyebrowLabel',
	component: EyebrowLabel,
	argTypes: {
		tone: { control: 'inline-radio', options: ['on-brand', 'brand'] },
	},
	args: {
		tone: 'on-brand',
		label: 'Compassion Food',
	},
};

export default meta;

type Story = StoryObj<EyebrowLabelArgs>;

/** On the brand-coloured hero at the top of the guest screen. */
export const OnBrand: Story = {
	args: { tone: 'on-brand' },
	render: (args) => ({
		components: { EyebrowLabel },
		setup: () => ({ args }),
		template: `
			<div class="hero">
				<EyebrowLabel :tone="args.tone">{{ args.label }}</EyebrowLabel>
				<h1>Welcome</h1>
			</div>
		`,
	}),
};

/** On the white background of the admin screens. */
export const Brand: Story = {
	args: { tone: 'brand', label: 'Team access' },
	render: (args) => ({
		components: { EyebrowLabel },
		setup: () => ({ args }),
		template: `
			<div>
				<EyebrowLabel :tone="args.tone">{{ args.label }}</EyebrowLabel>
				<h1 style="color: var(--color-brand);">Market admin</h1>
			</div>
		`,
	}),
};
