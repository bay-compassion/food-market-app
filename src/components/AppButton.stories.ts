import type { Meta, StoryObj } from '@storybook/vue3-vite';

import AppButton from './AppButton.vue';

/**
 * `label` and `disabled` are story-only args rather than component props: the button takes its
 * text through the default slot, and `disabled` is a plain HTML attribute that falls through.
 * Declaring them here is what puts them in the controls panel.
 */
type AppButtonArgs = {
	variant: 'primary' | 'secondary';
	label: string;
	disabled: boolean;
};

const meta: Meta<AppButtonArgs> = {
	title: 'Primitives/AppButton',
	component: AppButton,
	parameters: { layout: 'centered' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
	},
	args: {
		variant: 'primary',
		label: 'Join the queue',
		disabled: false,
	},
	render: (args) => ({
		components: { AppButton },
		setup: () => ({ args }),
		template: `
			<AppButton :variant="args.variant" :disabled="args.disabled">{{ args.label }}</AppButton>
		`,
	}),
};

export default meta;

type Story = StoryObj<AppButtonArgs>;

/** The main call to action — the button that submits the check-in form. */
export const Primary: Story = {};

/** Used for the secondary path out of a screen, such as cancelling a visit. */
export const Secondary: Story = {
	args: { variant: 'secondary', label: 'Cancel my visit' },
};

/** How every button looks while a request is in flight. Note the cursor becomes `wait`. */
export const Disabled: Story = {
	args: { disabled: true, label: 'Submitting…' },
};

/** Both variants together, which is the quickest way to check they still read as a pair. */
export const AllVariants: Story = {
	parameters: { controls: { disable: true } },
	render: () => ({
		components: { AppButton },
		template: `
			<div style="display: grid; gap: 16px; justify-items: start;">
				<AppButton variant="primary">Join the queue</AppButton>
				<AppButton variant="secondary">Cancel my visit</AppButton>
				<AppButton variant="primary" disabled>Submitting…</AppButton>
				<AppButton variant="secondary" disabled>Cancelling…</AppButton>
			</div>
		`,
	}),
};
