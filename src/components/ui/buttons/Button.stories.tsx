import { Button } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';

/** MUI buttons rendered with the app's theme. */
const meta = {
	title: 'Primitives/Button',
	component: Button,
	parameters: { shell: 'bare', layout: 'centered' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['contained', 'outlined', 'text'] },
	},
	args: {
		variant: 'contained',
		children: 'Join the queue',
		disabled: false,
	},
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
	args: { variant: 'outlined', children: 'Cancel my visit' },
};

export const Disabled: Story = {
	args: { disabled: true, children: 'Submitting…' },
};

export const WithTrailingGlyph: Story = {
	args: { children: 'Check in', endIcon: <span aria-hidden="true">→</span> },
};

export const AllVariants: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
			<Button variant="contained">Join the queue</Button>
			<Button variant="outlined">Cancel my visit</Button>
			<Button variant="contained" disabled>
				Submitting…
			</Button>
			<Button variant="outlined" disabled>
				Cancelling…
			</Button>
		</div>
	),
};
