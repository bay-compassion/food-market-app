import { TextField, type TextFieldProps } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ageRanges } from '../../services/ageRanges';

/** A story owns the value the way a parent component would, so typing actually works. */
function Controlled({ value: initial, onChange, ...props }: TextFieldProps) {
	const [value, setValue] = useState(initial);

	return (
		<TextField
			{...props}
			value={value}
			onChange={(event) => {
				setValue(event.target.value);
				onChange?.(event);
			}}
		/>
	);
}

const meta = {
	title: 'Primitives/TextField',
	component: Controlled,
	parameters: { shell: 'guest' },
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'number', 'tel', 'password'],
		},
		onChange: { action: 'change' },
	},
	args: {
		label: 'First name',
		value: '',
		type: 'text',
		required: true,
	},
} satisfies Meta<typeof Controlled>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The plain case: a required text field. */
export const Text: Story = {};

/** Filled in, so the value styling is visible. */
export const Filled: Story = {
	args: { value: 'Maria' },
};

/** Placeholder copy shows through in the muted placeholder color until the guest types. */
export const WithPlaceholder: Story = {
	args: {
		label: 'People in your household',
		type: 'number',
		slotProps: { htmlInput: { min: 1, max: 30, inputMode: 'numeric' } },
		placeholder: 'Include yourself',
	},
};

/** A phone number, which opens the numeric keypad on a phone. */
export const Phone: Story = {
	args: {
		label: 'Phone number',
		type: 'tel',
		slotProps: { htmlInput: { inputMode: 'tel' } },
		placeholder: '(555) 123-4567',
	},
};

/** A generic password field state for consumers that need masked input. */
export const Password: Story = {
	args: { label: 'Password', type: 'password', value: 'example' },
};

/** A native select keeps the mobile platform picker for age ranges. */
export const Select: Story = {
	args: {
		label: 'Age',
		select: true,
		slotProps: { select: { native: true } },
		value: '',
		children: [
			<option key="placeholder" value="" disabled>
				Select your age range
			</option>,
			...ageRanges.map((range) => (
				<option key={range} value={range}>
					{range}
				</option>
			)),
		],
	},
};

/**
 * `multiline` is the free-text answer to a registration question: several lines tall, and
 * left untrimmed as it is typed so the spaces between words survive.
 */
export const Textarea: Story = {
	args: { label: 'How did you travel here today?', multiline: true, rows: 3, value: '' },
};

/** Several fields stacked, which is how they are actually seen. */
export const InAForm: Story = {
	parameters: { controls: { disable: true } },
	render: () => {
		const [guest, setGuest] = useState({ firstName: 'Maria', lastName: '', household: '' });

		return (
			<form style={{ display: 'grid', gap: 18 }}>
				<TextField
					label="First name"
					value={guest.firstName}
					onChange={(event) => setGuest((g) => ({ ...g, firstName: event.target.value }))}
					required
				/>
				<TextField
					label="Last name"
					value={guest.lastName}
					onChange={(event) => setGuest((g) => ({ ...g, lastName: event.target.value }))}
					required
				/>
				<TextField
					label="People in your household"
					value={guest.household}
					onChange={(event) => setGuest((g) => ({ ...g, household: event.target.value }))}
					type="number"
					slotProps={{ htmlInput: { inputMode: 'numeric' } }}
					required
				/>
			</form>
		);
	},
};
