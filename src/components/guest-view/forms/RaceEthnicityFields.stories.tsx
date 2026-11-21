import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../../locales';
import { RaceEthnicityFields } from './RaceEthnicityFields';

const strings = translations.en.guestView.forms.raceEthnicity;

/**
 * How a guest describes themselves, in OMB SPD 15's combined question and its seven minimum
 * categories, plus a self-description and "Prefer not to answer". Asked in the lottery step until
 * the guest's record holds an answer; the answer reads and writes the registration store, which the
 * preview's decorator provides fresh per story.
 */
const meta = {
	title: 'Guest/Registration/Race and Ethnicity',
	component: RaceEthnicityFields,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<form>
				<Story />
			</form>
		),
	],
} satisfies Meta<typeof RaceEthnicityFields>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every choice unticked: the question is optional. */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('group', { name: strings.legend })).toBeInTheDocument();
		await expect(canvas.getAllByRole('checkbox')).toHaveLength(9);
	},
};

/** A guest may tick several identities; "Prefer not to answer" clears them, and the reverse. */
export const PreferNotToAnswerStandsAlone: Story = {
	play: async ({ canvas, userEvent }) => {
		const asian = canvas.getByRole('checkbox', { name: strings.options.asian });
		const white = canvas.getByRole('checkbox', { name: strings.options.white });
		const declined = canvas.getByRole('checkbox', { name: strings.options.prefer_not_to_answer });

		await userEvent.click(asian);
		await userEvent.click(white);
		await expect(asian).toBeChecked();
		await expect(white).toBeChecked();

		await userEvent.click(declined);
		await expect(declined).toBeChecked();
		await expect(asian).not.toBeChecked();
		await expect(white).not.toBeChecked();

		await userEvent.click(asian);
		await expect(asian).toBeChecked();
		await expect(declined).not.toBeChecked();
	},
};

/** "Some other race and/or ethnicity" opens a field for the guest's own words, which it then requires. */
export const AnotherIdentity: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.queryByLabelText(strings.otherLabel, { exact: false })).toBeNull();

		await userEvent.click(canvas.getByRole('checkbox', { name: strings.options.another }));

		const field = canvas.getByRole('textbox', { name: new RegExp(strings.otherLabel) });

		await expect(field).toBeRequired();
		await userEvent.type(field, 'Cape Verdean');
		await expect(field).toHaveValue('Cape Verdean');
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'fa' },
	play: async ({ canvas }) => {
		const farsi = translations.fa.guestView.forms.raceEthnicity;

		await expect(canvas.getByRole('group', { name: farsi.legend })).toBeInTheDocument();
	},
};
