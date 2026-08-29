import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { translations } from '../../locales';
import type { SessionQuestion } from '../../stores/market-session.store';
import { GuestLotteryForm } from './GuestLotteryForm';

/**
 * The lottery-entry fields — age range, household composition, and any per-session registration
 * questions.
 *
 * The household counts read and write the registration store, which the preview's decorator
 * provides fresh per story. Only `registrationQuestions` is a prop, because which questions a
 * session asks is the container's business, and driving it from a control is how a reviewer sees
 * the dynamic block at all.
 */
const sampleQuestions: SessionQuestion[] = [
	{
		id: 'q-transport',
		prompt: 'How did you travel here today?',
		type: 'text',
		required: false,
	},
	{ id: 'q-rating', prompt: 'How easy was it to sign up?', type: 'scale', required: true },
];

const meta = {
	title: 'Guest/GuestLotteryForm',
	component: GuestLotteryForm,
	parameters: { shell: 'guest' },
	args: { registrationQuestions: [] },
	decorators: [
		(Story) => (
			<form>
				<Story />
			</form>
		),
	],
} satisfies Meta<typeof GuestLotteryForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The lottery-entry fields on their own. */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.en.age)).toBeInTheDocument();
		await expect(
			canvas.getByRole('group', { name: translations.en.household }),
		).toBeInTheDocument();
	},
};

/**
 * Household size starts its buttons at 1 while the other two counts start at 0 — the household
 * always contains at least the guest.
 */
export const CountsAreSelectable: Story = {
	play: async ({ canvas, userEvent }) => {
		const household = canvas.getByRole('group', { name: translations.en.household });
		const children = canvas.getByRole('group', { name: translations.en.childrenCount });

		await expect(within(household).queryByRole('button', { name: '0' })).not.toBeInTheDocument();
		await expect(within(children).getByRole('button', { name: '0' })).toBeInTheDocument();

		await userEvent.click(within(household).getByRole('button', { name: '3' }));
		await expect(within(household).getByRole('button', { name: '3' })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
	},
};

/** Registration questions configured in the admin question bank appear at the end of the form. */
export const WithRegistrationQuestions: Story = {
	args: { registrationQuestions: sampleQuestions },
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByText(sampleQuestions[0]!.prompt)).toBeInTheDocument();

		// The scale question is a select of 1–10; the text question is a free-form textarea.
		const scale = canvas.getByLabelText(sampleQuestions[1]!.prompt);

		await userEvent.selectOptions(scale, '7');
		await expect(scale).toHaveValue('7');
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.ar.age)).toBeInTheDocument();
	},
};
