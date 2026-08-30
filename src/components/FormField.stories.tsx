import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { ageRanges } from '../services/ageRanges';
import { FormField, type FormFieldProps } from './FormField';

/**
 * The labelled input every form on the guest side is built from.
 *
 * `type` does more than pick an input type: `select` swaps the input for a `<select>` built from
 * the `options` prop, which is how the age range field works, and `textarea` for a multi-line box
 * `rows` tall, which is what a free-text registration question gets.
 */

/** `onChange` is optional here: the wrapper owns the value, so a story need not supply one. */
type ControlledProps = Omit<FormFieldProps, 'onChange'> & {
	onChange?: FormFieldProps['onChange'];
};

/** A story owns the value the way a parent component would, so typing actually works. */
function Controlled({ value: initial, onChange, ...props }: ControlledProps) {
	const [value, setValue] = useState(initial);

	return (
		<FormField
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
	title: 'Primitives/FormField',
	component: Controlled,
	parameters: { shell: 'guest' },
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'number', 'tel', 'password', 'select', 'textarea'],
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
		min: 1,
		max: 30,
		inputmode: 'numeric',
		placeholder: 'Include yourself',
	},
};

/** A phone number, which opens the numeric keypad on a phone. */
export const Phone: Story = {
	args: { label: 'Phone number', type: 'tel', inputmode: 'tel', placeholder: '(555) 123-4567' },
};

/** A generic password field state for consumers that need masked input. */
export const Password: Story = {
	args: { label: 'Password', type: 'password', value: 'example' },
};

/** `type="select"` builds its options from the `options` prop — this is the age range field. */
export const Select: Story = {
	args: {
		label: 'Age',
		type: 'select',
		value: '',
		options: [
			{ value: '', label: 'Select your age range', disabled: true },
			...ageRanges.map((range) => ({ value: range, label: range })),
		],
	},
};

/**
 * `type="textarea"` is the free-text answer to a registration question: several lines tall, and
 * left untrimmed as it is typed so the spaces between words survive.
 */
export const Textarea: Story = {
	args: { label: 'How did you travel here today?', type: 'textarea', rows: 3, value: '' },
};

/** Several fields stacked, which is how they are actually seen. */
export const InAForm: Story = {
	parameters: { controls: { disable: true } },
	render: () => {
		const [guest, setGuest] = useState({ firstName: 'Maria', lastName: '', household: '' });

		return (
			<form style={{ display: 'grid', gap: 18 }}>
				<FormField
					label="First name"
					value={guest.firstName}
					onChange={(value) => setGuest((g) => ({ ...g, firstName: String(value) }))}
					required
				/>
				<FormField
					label="Last name"
					value={guest.lastName}
					onChange={(value) => setGuest((g) => ({ ...g, lastName: String(value) }))}
					required
				/>
				<FormField
					label="People in your household"
					value={guest.household}
					onChange={(value) => setGuest((g) => ({ ...g, household: String(value) }))}
					type="number"
					inputmode="numeric"
					required
				/>
			</form>
		);
	},
};
