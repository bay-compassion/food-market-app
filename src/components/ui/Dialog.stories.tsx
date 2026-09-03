import { Button } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

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
			<Button type="button" onClick={() => setOpen(true)}>
				Open dialog
			</Button>
			<Dialog
				open={open}
				title={title}
				closeLabel={closeLabel}
				onClose={() => setOpen(false)}
				actions={<Button type="button">Continue</Button>}
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
		const body = within(document.body);

		await expect(await body.findByRole('dialog')).toBeInTheDocument();
		await expect(body.getByRole('heading', { name: 'Dialog title' })).toBeInTheDocument();
	},
};
