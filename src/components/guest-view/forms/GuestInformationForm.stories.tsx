import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../../locales';
import { GuestInformationForm } from './GuestInformationForm';

/**
 * The identity-only fields — first name, last name, phone — shared by the standalone early
 * sign-up screen and the combined registration-open form.
 *
 * The fields read and write the registration store, which the preview's decorator provides fresh
 * per story, so there is nothing to seed here: the form starts empty and typing into it works.
 * The language comes from that same store, which the toolbar's locale picker drives.
 */
const meta = {
	title: 'Guest/Forms/Information Form',
	component: GuestInformationForm,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<form>
				<Story />
			</form>
		),
	],
} satisfies Meta<typeof GuestInformationForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The identity fields on their own. */
export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		const firstName = canvas.getByLabelText(translations.en.firstName);

		await expect(firstName).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.lastName)).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.phone)).toBeInTheDocument();

		// The fields write through the store rather than local state, so typing is worth asserting:
		// a component reading the store without `observer()` renders the first keystroke and stops.
		await userEvent.type(firstName, 'Ari');
		await expect(firstName).toHaveValue('Ari');
	},
};

/** The phone field formats digits as they are typed, rather than asking for the punctuation. */
export const PhoneFormatting: Story = {
	play: async ({ canvas, userEvent }) => {
		const phone = canvas.getByLabelText(translations.en.phone);

		await userEvent.type(phone, '5551234567');
		await expect(phone).toHaveValue('(555) 123-4567');
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.ar.firstName)).toBeInTheDocument();
	},
};
