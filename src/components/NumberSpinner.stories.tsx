import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { translations } from '../locales';
import { NumberSpinner, type NumberSpinnerProps } from './NumberSpinner';

/**
 * A count with a step-down and step-up button either side of the number — MUI's number spinner,
 * which is Base UI's `NumberField` wearing this app's outlined input and buttons.
 *
 * `decrementLabel` and `incrementLabel` come from `locales.ts` (`countDecrementLabel`,
 * `countIncrementLabel`), so a reviewer can drive them from the toolbar's language picker like any
 * other user-facing text.
 */

/** `onChange` is optional here: the wrapper owns the value, so a story need not supply one. */
type ControlledProps = Omit<NumberSpinnerProps, 'onChange'> & {
	onChange?: NumberSpinnerProps['onChange'];
};

/** A story owns the value the way the parent component would, so typing actually works. */
function Controlled({ value: initial, onChange, ...props }: ControlledProps) {
	const [value, setValue] = useState(initial);

	return (
		<NumberSpinner
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
	title: 'Primitives/Number Spinner',
	component: Controlled,
	parameters: { shell: 'guest' },
	argTypes: { onChange: { action: 'change' } },
	args: {
		label: 'Number of children you’re shopping for',
		value: '',
		min: 0,
		max: 30,
		required: true,
		decrementLabel: translations.en.countDecrementLabel,
		incrementLabel: translations.en.countIncrementLabel,
	},
} satisfies Meta<typeof Controlled>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The plain case: nothing answered yet, so the field is blank. */
export const Empty: Story = {};

/** A count already answered — the shape the field takes once the guest has stepped or typed. */
export const WithValue: Story = {
	args: { value: 2 },
};

/**
 * Household size starts at 1, not 0, and clarifies who to count in the household total.
 */
export const HouseholdSize: Story = {
	args: {
		label: 'Number of people in your household',
		hint: 'Include yourself',
		min: 1,
		value: 1,
	},
};

/** At the floor of the range, stepping down is no longer an action the button offers. */
export const AtMinimum: Story = {
	args: { value: 0 },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('button', { name: translations.en.countDecrementLabel }),
		).toBeDisabled();
	},
};

/** The two buttons move the count by one, and stop at the ends of the range rather than past them. */
export const Stepping: Story = {
	args: { value: 1 },
	play: async ({ canvas, userEvent }) => {
		const increment = canvas.getByRole('button', {
			name: translations.en.countIncrementLabel,
		});
		const decrement = canvas.getByRole('button', {
			name: translations.en.countDecrementLabel,
		});
		// By role, not label text: the group carries the same name, so the field is the textbox of
		// the two things wearing it.
		const field = canvas.getByRole('textbox', { name: meta.args.label });

		await userEvent.click(increment);
		await expect(field).toHaveValue('2');

		await userEvent.click(decrement);
		await userEvent.click(decrement);
		await expect(field).toHaveValue('0');

		// The floor, so the button stops rather than the value going negative.
		await expect(decrement).toBeDisabled();
	},
};

/**
 * Stepping is the quick path, not the only one: a count well past what anyone would press the
 * button for is typed straight in, and clamped to `max` rather than accepted beyond it.
 */
export const TypingBeyondTheMaximum: Story = {
	play: async ({ canvas, userEvent }) => {
		// By role, not label text: the group carries the same name, so the field is the textbox of
		// the two things wearing it.
		const field = canvas.getByRole('textbox', { name: meta.args.label });

		await userEvent.type(field, '12');
		await expect(field).toHaveValue('12');

		await userEvent.clear(field);
		await userEvent.type(field, '99');
		await userEvent.tab();

		await expect(field).toHaveValue('30');
	},
};

/**
 * A form built around this component can tell whether it is complete: the field carries `required`
 * itself, so an unanswered count blocks submission and any answer — stepped or typed — satisfies it.
 */
export const RequiredValidation: Story = {
	render: (args) => (
		<form>
			<Controlled {...args} />
		</form>
	),
	play: async ({ canvasElement, canvas, userEvent }) => {
		const form = canvasElement.querySelector('form') as HTMLFormElement;

		await expect(form.checkValidity()).toBe(false);

		await userEvent.click(
			canvas.getByRole('button', { name: translations.en.countIncrementLabel }),
		);

		await expect(form.checkValidity()).toBe(true);
	},
};

/**
 * Focusing the field selects the count, so typing replaces it: "3" then a typed "2" is 2, not 32.
 */
export const TypingReplacesTheCount: Story = {
	args: { value: 3 },
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByRole<HTMLInputElement>('textbox', { name: meta.args.label });

		await userEvent.click(field);
		await expect(field.selectionStart).toBe(0);
		await expect(field.selectionEnd).toBe(1);

		await userEvent.keyboard('2');

		await expect(field).toHaveValue('2');
	},
};

/** Zeros typed ahead of a digit drop away as they are typed; a lone zero is a count of its own. */
export const LeadingZerosAreTrimmed: Story = {
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByRole('textbox', { name: meta.args.label });

		await userEvent.type(field, '007');
		await expect(field).toHaveValue('7');

		await userEvent.clear(field);
		await userEvent.type(field, '0');
		await expect(field).toHaveValue('0');
	},
};

/**
 * Erasing the count and leaving the field puts back the count it held, rather than emptying a
 * required answer by accident.
 */
export const BlankRevertsOnBlur: Story = {
	args: { value: 4 },
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByRole('textbox', { name: meta.args.label });

		await userEvent.clear(field);
		await expect(field).toHaveValue('');

		await userEvent.tab();

		await expect(field).toHaveValue('4');
	},
};

/** A count that was never answered has nothing to go back to, so leaving it blank keeps it blank. */
export const UnansweredStaysBlank: Story = {
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByRole('textbox', { name: meta.args.label });

		await userEvent.click(field);
		await userEvent.tab();

		await expect(field).toHaveValue('');
	},
};
