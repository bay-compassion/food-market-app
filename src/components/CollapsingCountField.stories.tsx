import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { translations } from '../locales';
import { CollapsingCountField, type CollapsingCountFieldProps } from './CollapsingCountField';

/**
 * A count field whose number input takes over the row: focusing it collapses the buttons into a
 * single "<n" button, and clearing it — directly, or via that button — brings the buttons back.
 *
 * `otherLabel`, `otherPlaceholder`, and `backLabel` come from `locales.ts` (`countOtherLabel`,
 * `countOtherPlaceholder`, `countBackLabel`), so a reviewer can drive them from the toolbar's
 * language picker like any other user-facing text.
 */

/** `onChange` is optional here: the wrapper owns the value, so a story need not supply one. */
type ControlledProps = Omit<CollapsingCountFieldProps, 'onChange'> & {
	onChange?: CollapsingCountFieldProps['onChange'];
};

/** A story owns the value the way the parent component would, so typing actually works. */
function Controlled({ value: initial, onChange, ...props }: ControlledProps) {
	const [value, setValue] = useState(initial);

	return (
		<CollapsingCountField
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
	title: 'Primitives/CollapsingCountField',
	component: Controlled,
	parameters: { shell: 'guest' },
	argTypes: { onChange: { action: 'change' } },
	args: {
		label: 'Number of children you’re shopping for',
		value: '',
		options: [0, 1, 2, 3],
		required: true,
		max: 30,
		otherLabel: translations.en.countOtherLabel,
		otherPlaceholder: translations.en.countOtherPlaceholder,
		backLabel: translations.en.countBackLabel,
	},
} satisfies Meta<typeof Controlled>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The plain case: buttons showing, number field collapsed to a "4+" placeholder. */
export const Empty: Story = {};

/** One of the quick-select buttons is the current value — the number field stays collapsed. */
export const ButtonSelected: Story = {
	args: { value: 2 },
};

/** A count higher than any button. The buttons start collapsed away in favor of the number field. */
export const CustomCount: Story = {
	args: { value: 12 },
};

/**
 * Household size starts at 1, not 0, offers a different set of buttons, and clarifies who to count
 * in the household total.
 */
export const HouseholdSize: Story = {
	args: {
		label: 'Number of people in your household',
		hint: 'Include yourself',
		options: [1, 2, 3, 4],
		value: 1,
	},
};

/**
 * The interaction the screenshots can't show: focusing the number field collapses the buttons into
 * "<4" without the field itself ever losing focus. Typing a value the buttons don't cover and then
 * clicking "<4" doesn't discard it — it lands on the greatest button instead, the closest fit the
 * buttons have to offer.
 */
export const CollapseAndExpand: Story = {
	play: async ({ canvas, userEvent }) => {
		const numberField = await canvas.findByRole('spinbutton', {
			name: translations.en.countOtherLabel,
		});

		await userEvent.click(numberField);
		await expect(document.activeElement).toBe(numberField);
		await expect(canvas.queryByRole('button', { name: '0' })).not.toBeInTheDocument();

		const backButton = await canvas.findByRole('button', {
			name: translations.en.countBackLabel,
		});

		await userEvent.type(numberField, '12');
		await expect(document.activeElement).toBe(numberField);

		await userEvent.click(backButton);
		await expect(numberField).toHaveValue(null);
		await expect(await canvas.findByRole('button', { name: '3' })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
	},
};

/**
 * Focusing the number field after a button is already selected must not read as clearing the
 * count: the field itself stays blank (with an "Enter value" placeholder, not the boundary
 * placeholder or the button's own value), and blurring without typing anything lands back on that
 * same button, still active, rather than on nothing.
 */
export const FocusingLeavesTheButtonValueAlone: Story = {
	args: { value: 2 },
	play: async ({ canvas, userEvent }) => {
		const numberField = await canvas.findByRole('spinbutton', {
			name: translations.en.countOtherLabel,
		});

		await userEvent.click(numberField);
		await expect(numberField).toHaveValue(null);
		await expect(numberField).toHaveAttribute('placeholder', translations.en.countOtherPlaceholder);

		await userEvent.click(document.body);
		await expect(await canvas.findByRole('button', { name: '2' })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
	},
};

/**
 * Whichever way the count is set, the validity anchor is enough for a form built around this
 * component to know whether it's complete — clicking a button satisfies it exactly like typing a
 * custom value does.
 */
export const RequiredValidation: Story = {
	args: { value: '' },
	render: (args) => (
		<form>
			<Controlled {...args} />
		</form>
	),
	play: async ({ canvasElement, canvas, userEvent }) => {
		const form = canvasElement.querySelector('form') as HTMLFormElement;

		await expect(form.checkValidity()).toBe(false);

		await userEvent.click(await canvas.findByRole('button', { name: '2' }));

		await expect(form.checkValidity()).toBe(true);
	},
};
