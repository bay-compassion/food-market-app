import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { ageRanges } from '../services/ageRanges';
import FormField from './FormField.vue';

type FormFieldArgs = {
	label: string;
	modelValue: string | number;
	type: string;
	required: boolean;
	placeholder?: string;
	min?: number;
	max?: number;
	inputmode?: 'text' | 'numeric' | 'tel';
};

/**
 * The labelled input every form on the guest side is built from.
 *
 * `type` does more than pick an input type: `select` swaps the input for a `<select>` that renders
 * the default slot as its options, which is how the age range field works.
 */
const meta: Meta<FormFieldArgs> = {
	title: 'Primitives/FormField',
	component: FormField,
	parameters: { shell: 'guest' },
	argTypes: {
		type: { control: 'select', options: ['text', 'number', 'tel', 'password', 'select'] },
	},
	args: {
		label: 'First name',
		modelValue: '',
		type: 'text',
		required: true,
	},
	render: (args) => ({
		components: { FormField },
		setup() {
			// A story owns the value the way the parent component would, so typing actually works.
			const value = ref(args.modelValue);

			return { args, value };
		},
		template: `<FormField v-bind="args" v-model="value" />`,
	}),
};

export default meta;

type Story = StoryObj<FormFieldArgs>;

/** The plain case: a required text field. */
export const Text: Story = {};

/** Filled in, so the value styling is visible. */
export const Filled: Story = {
	args: { modelValue: 'Maria' },
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
	args: { label: 'Password', type: 'password', modelValue: 'example' },
};

/** `type="select"` renders the default slot as options — this is the age range field. */
export const Select: Story = {
	args: { label: 'Age', type: 'select', modelValue: '' },
	render: (args) => ({
		components: { FormField },
		setup() {
			const value = ref(args.modelValue);

			return { args, value, ageRanges };
		},
		template: `
			<FormField v-bind="args" v-model="value">
				<option value="" disabled>Select your age range</option>
				<option v-for="range in ageRanges" :key="range" :value="range">{{ range }}</option>
			</FormField>
		`,
	}),
};

/** Several fields stacked, which is how they are actually seen. */
export const InAForm: Story = {
	parameters: { controls: { disable: true } },
	render: () => ({
		components: { FormField },
		setup() {
			const guest = ref({ firstName: 'Maria', lastName: '', household: '', phone: '' });

			return { guest };
		},
		template: `
			<form style="display: grid; gap: 18px;">
				<FormField v-model="guest.firstName" label="First name" required />
				<FormField v-model="guest.lastName" label="Last name" required />
				<FormField
					v-model="guest.household"
					label="People in your household"
					type="number"
					inputmode="numeric"
					placeholder="Include yourself"
					required
				/>
				<FormField
					v-model="guest.phone"
					label="Phone number"
					type="tel"
					inputmode="tel"
					placeholder="(555) 123-4567"
					required
				/>
			</form>
		`,
	}),
};
