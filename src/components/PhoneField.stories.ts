import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { ref } from 'vue';

import PhoneField from './PhoneField.vue';

type PhoneFieldArgs = {
	label: string;
	modelValue: string;
	required: boolean;
	placeholder?: string;
};

/**
 * A `FormField` that formats digits into `(555) 123-4567` as the guest types. Try typing a run of
 * digits into the control to see the formatting apply live.
 */
const meta: Meta<PhoneFieldArgs> = {
	title: 'Primitives/PhoneField',
	component: PhoneField,
	parameters: { shell: 'guest' },
	args: {
		label: 'Phone number',
		modelValue: '',
		required: true,
	},
	render: (args) => ({
		components: { PhoneField },
		setup() {
			const value = ref(args.modelValue);

			return { args, value };
		},
		template: `<PhoneField v-bind="args" v-model="value" />`,
	}),
};

export default meta;

type Story = StoryObj<PhoneFieldArgs>;

/** Empty, showing the placeholder that hints at the expected format. */
export const Empty: Story = {};

/** A complete number, formatted. */
export const Filled: Story = {
	args: { modelValue: '(555) 123-4567' },
};

/** Typing digits formats them live, and a stray extra keystroke past the tenth digit never sits
 *  visibly in the field even though it doesn't change the already-complete formatted value. */
export const TypingFormats: Story = {
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByLabelText('Phone number');

		await userEvent.type(input, '55512345678');
		await expect(input).toHaveValue('(555) 123-4567');
	},
};
