import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { AppButton } from '../AppButton';
import { Dialog } from './Dialog';

type DialogArgs = {
	title: string;
	closeLabel: string;
};

/** A host that owns `open`, so the story exercises opening and closing rather than a fixed state. */
function DialogHost({ title, closeLabel }: DialogArgs) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<AppButton type="button" onClick={() => setOpen(true)} label="Open dialog" />
			<Dialog
				open={open}
				title={title}
				closeLabel={closeLabel}
				onClose={() => setOpen(false)}
				actions={<AppButton type="button" label="Continue" />}
			>
				<p>Dialog content can contain forms, messages, or other focused tasks.</p>
			</Dialog>
		</>
	);
}

const meta = {
	title: 'Primitives/Dialog',
	component: DialogHost,
	tags: ['autodocs'],
	parameters: { shell: 'bare' },
	args: {
		title: 'Dialog title',
		closeLabel: 'Close dialog',
	},
} satisfies Meta<typeof DialogHost>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();

		await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));

		await expect(await canvas.findByRole('dialog')).toBeInTheDocument();
		await expect(canvas.getByRole('heading', { name: 'Dialog title' })).toBeInTheDocument();
	},
};
