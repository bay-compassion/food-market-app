import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { ScheduleInformation } from './ScheduleInformation';

// The body copy uses `outdent` for a readable multi-line literal in locales.ts; the browser
// collapses that embedded newline to a space when it renders, so comparisons must normalize
// whitespace on both sides rather than matching the literal multi-line string.
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

const meta = {
	title: 'Guest/ScheduleInformation',
	component: ScheduleInformation,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<div style={{ maxWidth: '360px' }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ScheduleInformation>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The schedule information alert shown to guests on the check-in page. */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText(translations.en.guestView.scheduleInformation.heading),
		).toBeInTheDocument();

		const expectedBody = normalize(translations.en.guestView.scheduleInformation.body);

		await expect(
			canvas.getByText((_, element) => normalize(element?.textContent ?? '') === expectedBody),
		).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText(translations.ar.guestView.scheduleInformation.heading),
		).toBeInTheDocument();
	},
};
