import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { SchedulePayload } from '../../services/schedule-payload';
import { PatternQuestionBank } from './PatternQuestionBank';

const t = adminTranslations.en;
const originalFetch = window.fetch.bind(window);
const location = { id: 'location-story', name: 'The Bay Church', timeZone: 'America/Los_Angeles' };

type Args = { payload: SchedulePayload };

const withScheduleEndpoint: Decorator = (Story, context) => {
	const { payload } = context.args as Args;

	window.fetch = (input, init) =>
		String(input instanceof Request ? input.url : input).startsWith('/api/admin/schedule')
			? Promise.resolve(Response.json(payload))
			: originalFetch(input, init);

	return <Story />;
};

/** The question bank, now editing the recurrence pattern's questions. */
const meta = {
	title: 'Admin/Question Bank/PatternQuestionBank',
	component: PatternQuestionBank,
	parameters: { shell: 'admin' },
	decorators: [withScheduleEndpoint],
	render: () => <PatternQuestionBank />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const WithPattern: Story = {
	args: {
		payload: {
			location,
			pattern: {
				id: 'pattern-story',
				startsOn: '2026-09-19',
				registrationOpensAt: '10:30',
				registrationDurationMinutes: 60,
				capacity: 50,
				lotteryDelayMinutes: null,
				autoCloseAfterMinutes: 720,
				questions: [
					{ prompt: 'How many people are you shopping for?', type: 'text', required: true },
				],
			},
			sessions: [],
		},
	},
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByDisplayValue('How many people are you shopping for?'),
		).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: t.saveSettings })).toBeEnabled();
	},
};

export const NeedsPattern: Story = {
	args: { payload: { location, pattern: null, sessions: [] } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.questionBankNeedsPattern)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: t.saveSettings })).toBeDisabled();
	},
};
