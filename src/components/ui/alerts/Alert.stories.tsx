import type { Meta, StoryObj } from '@storybook/react-vite';

import { Alert } from './Alert';

const meta = {
	title: 'Primitives/Alert',
	component: Alert,
	parameters: { layout: 'padded' },
	argTypes: {
		severity: { control: 'inline-radio', options: ['info', 'success', 'warning', 'error'] },
	},
	args: {
		severity: 'info',
		heading: 'Heads up',
		body: 'The market opens at 9am and closes once the last guest in line has been served.',
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: '360px' }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Neutral, informational messages. Uses the brand color, same as the rest of the interface. */
export const Info: Story = {};

/** Confirms something went right. Reuses the checkmark glyph from the guest success state. */
export const Success: Story = {
	args: {
		severity: 'success',
		heading: 'You are checked in',
		body: "We'll text you when it's your turn.",
	},
};

/** Draws attention without signaling failure, such as a closing countdown. */
export const Warning: Story = {
	args: {
		severity: 'warning',
		heading: 'Registration closes soon',
		body: 'Sign up in the next 10 minutes to hold your place in line.',
	},
};

/** A failed action, matching the color used for validation messages elsewhere in the app. */
export const Error: Story = {
	args: {
		severity: 'error',
		heading: 'Something went wrong',
		body: 'We could not save your visit. Please try again.',
	},
};

/** `icon` overrides the severity's default glyph, for a message the default doesn't quite fit. */
export const CustomIcon: Story = {
	args: {
		severity: 'info',
		heading: 'Bring a reusable bag',
		body: 'Bags help us pack more food for more neighbors.',
		icon: '🛍',
	},
};

/** All four severities together, which is the quickest way to check they still read as a set. */
export const AllSeverities: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'grid', gap: '16px', maxWidth: '360px' }}>
			<Alert severity="info" heading="Heads up" body="The market opens at 9am." />
			<Alert
				severity="success"
				heading="You are checked in"
				body="We'll text you when it's your turn."
			/>
			<Alert
				severity="warning"
				heading="Registration closes soon"
				body="Sign up in the next 10 minutes."
			/>
			<Alert severity="error" heading="Something went wrong" body="We could not save your visit." />
		</div>
	),
};
