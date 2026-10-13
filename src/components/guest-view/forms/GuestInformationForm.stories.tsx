import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { translations } from '../../../locales';
import { GuestInformationForm } from './GuestInformationForm';

/**
 * The identity-only fields — first name, an offer to add how to say it, last name, phone — shared by the standalone early
 * sign-up screen and the combined registration-open form.
 *
 * The fields read and write the registration store, which the preview's decorator provides fresh
 * per story, so there is nothing to seed here: the form starts empty and typing into it works.
 * The language comes from that same store, which the toolbar's locale picker drives.
 */
const meta = {
	title: 'Guest/Registration/Information Form',
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

/**
 * Names with a space in them — two given names, a compound surname — survive being typed.
 *
 * The fields used to trim on every keystroke, which swallowed the space as soon as it was pressed
 * and made a two-word name impossible to enter. Surrounding whitespace is still tidied, but only
 * once the guest leaves the field.
 */
export const MultiWordNames: Story = {
	play: async ({ canvas, userEvent }) => {
		const firstName = canvas.getByLabelText(translations.en.firstName);
		const lastName = canvas.getByLabelText(translations.en.lastName);

		await userEvent.type(firstName, 'Mary Jane');
		await userEvent.type(lastName, ' de la Cruz ');
		await userEvent.tab();

		await expect(firstName).toHaveValue('Mary Jane');
		await expect(lastName).toHaveValue('de la Cruz');
	},
};

/**
 * How to say the guest's name is optional, so under the first name it is only offered, politely,
 * and opens into a field when the guest takes the offer up.
 */
export const AddingAPronunciation: Story = {
	play: async ({ canvas, userEvent }) => {
		const forms = translations.en.guestView.forms;

		await expect(canvas.queryByLabelText(forms.pronunciationLabel)).toBeNull();

		await userEvent.click(canvas.getByRole('button', { name: forms.pronunciationOffer }));

		const pronunciation = await canvas.findByLabelText(forms.pronunciationLabel);

		// Focus follows once the panel has finished opening.
		await waitFor(() => expect(pronunciation).toHaveFocus());
		await userEvent.type(pronunciation, 'shi-VAWN');
		await expect(pronunciation).toHaveValue('shi-VAWN');
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
