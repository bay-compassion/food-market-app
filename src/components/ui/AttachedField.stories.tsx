import { TextField } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import { AttachedField } from './AttachedField';

type AttachedFieldArgs = {
	value: string;
	/** Whether there is a field to hang from, or the strip stands alone. */
	attached: boolean;
};

const copy = {
	offer: 'Add how to say your name',
	label: 'Sounds like',
	hint: 'Write it the way it sounds, so we can call your name correctly.',
	collapseLabel: 'Hide how to say your name',
};

/** The story owns the values the way a parent component would, so typing actually works. */
function Controlled({ value: initial, attached }: AttachedFieldArgs) {
	const [firstName, setFirstName] = useState('Siobhan');
	const [value, setValue] = useState(initial);

	return (
		<AttachedField {...copy} value={value} onChange={setValue} maxLength={100}>
			{attached ? (
				<TextField
					label="First name"
					value={firstName}
					onChange={(event) => setFirstName(event.target.value)}
				/>
			) : undefined}
		</AttachedField>
	);
}

/**
 * An optional, secondary field folded into a thin strip under the field it belongs to. Tapping
 * the strip opens it into a slim field joined to the one above; folding it keeps what was written
 * and shows it in the strip. Hang it from any `TextField` without helper text.
 */
const meta = {
	title: 'Primitives/Attached Field',
	component: Controlled,
	parameters: { shell: 'guest' },
	args: { value: '', attached: true },
} satisfies Meta<typeof Controlled>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Folded: a strip under the field, offering the optional one. */
export const Folded: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: copy.offer })).toHaveAttribute(
			'aria-expanded',
			'false',
		);
		await expect(canvas.queryByLabelText(copy.label)).toBeNull();
	},
};

/** Opening it moves the focus into the field; folding it shows what was written, and focus returns. */
export const OpeningAndFolding: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: copy.offer }));

		const field = canvas.getByLabelText(copy.label);

		await waitFor(() => expect(field).toHaveFocus());
		await expect(field).toHaveAccessibleDescription(copy.hint);
		await userEvent.type(field, 'shi-VAWN');
		await userEvent.click(canvas.getByRole('button', { name: copy.collapseLabel }));

		const strip = canvas.getByRole('button', { name: `${copy.label} shi-VAWN` });

		await waitFor(() => expect(strip).toHaveFocus());
	},
};

/** Something already written shows in the folded strip instead of the offer. */
export const AlreadyWritten: Story = {
	args: { value: 'shi-VAWN' },
};

/** With no field above it, the strip has a full outline of its own. */
export const Standalone: Story = {
	args: { attached: false },
};
