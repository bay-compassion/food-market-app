import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppButton } from './AppButton';

/**
 * The app's button, in both of its variants.
 *
 * It takes its text as a `label` prop rather than as children. That is a migration constraint
 * rather than a preference — a React island cannot receive Vue-owned slot content, and Vue
 * components still render this button.
 */
const meta = {
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
} satisfies Meta<typeof AppButton>;

export default meta;

type Story = StoryObj<typeof meta>;

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

/** The registration form's submit button, which carries a decorative arrow after its label. */
export const WithTrailingGlyph: Story = {
	args: { label: 'Check in', trailing: '→' },
};

/** Both variants together, which is the quickest way to check they still read as a pair. */
export const AllVariants: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
			<AppButton variant="primary" label="Join the queue" />
			<AppButton variant="secondary" label="Cancel my visit" />
			<AppButton variant="primary" label="Submitting…" disabled />
			<AppButton variant="secondary" label="Cancelling…" disabled />
		</div>
	),
};
