import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';

import { UnderlineButton } from './UnderlineButton';

const meta = {
	title: 'Components/UnderlineButton',
	component: UnderlineButton,
	parameters: { shell: 'bare' },
	args: { children: 'View as guest', onClick: fn() },
} satisfies Meta<typeof UnderlineButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas, args }) => {
		const button = canvas.getByRole('button');

		await expect(button).toBeDisabled();
		await userEvent.click(button);
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};

const onSubmit = fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());

export const KeyboardAndForm: Story = {
	render: (args) => (
		<form onSubmit={onSubmit}>
			<UnderlineButton {...args} />
		</form>
	),
	play: async ({ canvas, args }) => {
		const button = canvas.getByRole('button');

		button.focus();
		await expect(button).toHaveFocus();
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(' ');
		await expect(args.onClick).toHaveBeenCalledTimes(2);
		await expect(onSubmit).not.toHaveBeenCalled();
	},
};
