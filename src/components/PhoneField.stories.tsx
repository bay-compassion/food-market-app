import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { PhoneField, type PhoneFieldProps } from './PhoneField';

/**
 * A text field that formats digits into `(555) 123-4567` as the guest types. Try typing a run of
 * digits into the control to see the formatting apply live.
 */

/** `onChange` is optional here: the wrapper owns the value, so a story need not supply one. */
type ControlledProps = Omit<PhoneFieldProps, 'onChange'> & {
	onChange?: PhoneFieldProps['onChange'];
};

/** A story owns the value the way a parent component would, so typing actually works. */
function Controlled({ value: initial, onChange, ...props }: ControlledProps) {
	const [value, setValue] = useState(initial);

	return (
		<PhoneField
			{...props}
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange?.(next);
			}}
		/>
	);
}

const meta = {
	title: 'Primitives/PhoneField',
	component: Controlled,
	parameters: { shell: 'guest' },
	argTypes: { onChange: { action: 'change' } },
	args: {
		label: 'Phone number',
		value: '',
		required: true,
	},
} satisfies Meta<typeof Controlled>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty, showing the placeholder that hints at the expected format. */
export const Empty: Story = {};

/** A complete number, formatted. */
export const Filled: Story = {
	args: { value: '(555) 123-4567' },
};

/**
 * Typing digits formats them live, and a stray keystroke past the tenth digit never sits visibly
 * in the field even though it does not change the already-complete formatted value.
 */
export const TypingFormats: Story = {
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByLabelText('Phone number');

		await userEvent.type(input, '55512345678');
		await expect(input).toHaveValue('(555) 123-4567');
	},
};
