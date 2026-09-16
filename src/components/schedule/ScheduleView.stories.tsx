import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { DateTime } from 'luxon';
import { expect, fn, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { SchedulePayload, ScheduleSessionPayload } from '../../services/schedule-payload';
import { ScheduleView } from './ScheduleView';

/**
 * The Schedule tab against a mocked `/api/admin/schedule`. Dates are built from the current time in
 * the location's time zone, so the calendar always has the Pending session and the pattern's later
 * Saturdays in view.
 */
const t = adminTranslations.en;
const zone = 'America/Los_Angeles';
const originalFetch = window.fetch.bind(window);
const nextSaturday = DateTime.now()
	.setZone(zone)
	.plus({ days: 1 })
	.startOf('day')
	.set({ weekday: 6 });
const saturday =
	nextSaturday < DateTime.now().setZone(zone) ? nextSaturday.plus({ weeks: 1 }) : nextSaturday;
const opensAt = saturday.set({ hour: 10, minute: 30 });

const pattern = {
	id: 'pattern-story',
	startsOn: saturday.minus({ weeks: 4 }).toISODate()!,
	registrationOpensAt: '10:30',
	registrationDurationMinutes: 60,
	capacity: 50,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	questions: [
		{ prompt: 'How many people are you shopping for?', type: 'text' as const, required: true },
	],
};

function session(overrides: Partial<ScheduleSessionPayload> = {}): ScheduleSessionPayload {
	return {
		id: 'session-story',
		status: 'scheduled',
		recurrencePatternId: pattern.id,
		registrationOpensAt: opensAt.toUTC().toISO()!,
		registrationClosesAt: opensAt.plus({ hours: 1 }).toUTC().toISO()!,
		capacity: 50,
		lotteryDelayMinutes: null,
		autoCloseAfterMinutes: 720,
		lotteryDrawsAt: null,
		autoClosesAt: opensAt.plus({ hours: 12 }).toUTC().toISO()!,
		hasVisits: false,
		questions: pattern.questions,
		...overrides,
	};
}

type ScheduleStoryArgs = { payload: SchedulePayload; onNavigateSession: () => void };

const location = { id: 'location-story', name: 'The Bay Church', timeZone: zone };

/** Answers every schedule request with the story's payload, whatever the method. */
const withScheduleEndpoint: Decorator = (Story, context) => {
	const { payload } = context.args as ScheduleStoryArgs;

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		return url.startsWith('/api/admin/schedule')
			? Promise.resolve(Response.json(payload))
			: originalFetch(input, init);
	};

	return <Story />;
};

const meta = {
	title: 'Admin/Schedule/ScheduleView',
	component: ScheduleView,
	parameters: { shell: 'admin' },
	decorators: [withScheduleEndpoint],
	args: {
		payload: { location, pattern, sessions: [session()] },
		onNavigateSession: fn(),
	},
	render: ({ onNavigateSession }: ScheduleStoryArgs) => (
		<ScheduleView onNavigateSession={onNavigateSession} />
	),
} satisfies Meta<ScheduleStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PatternWithPendingSession: Story = {
	play: async ({ canvas }) => {
		const grid = await canvas.findByRole('grid', { name: t.scheduleGridLabel });

		await expect(await within(grid).findByText('Recurring')).toBeInTheDocument();
		await expect(within(grid).getByText('Pending')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: t.scheduleAddPattern })).toBeDisabled();
	},
};

export const NoPattern: Story = {
	args: { payload: { location, pattern: null, sessions: [] } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.scheduleNoRows)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: t.scheduleAddPattern })).toBeEnabled();
	},
};

export const AfterReset: Story = {
	args: { payload: { location, pattern, sessions: [] } },
};

export const ActiveSession: Story = {
	args: {
		payload: {
			location,
			pattern,
			sessions: [session({ status: 'registration_open' })],
		},
	},
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.scheduleOneOffBlockedActive)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: t.scheduleAddOneOff })).toBeDisabled();
	},
};

export const OneOffPending: Story = {
	args: {
		payload: { location, pattern, sessions: [session({ recurrencePatternId: null })] },
	},
};

export const AddOneOffOpensTheForm: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.scheduleAddOneOff }));

		const dialog = within(await within(document.body).findByRole('dialog'));

		await expect(dialog.getByText(t.scheduleOneOffDialogTitle)).toBeInTheDocument();
		// The pickers keep their formatted value on a hidden input behind the editable sections.
		await expect(dialog.getByDisplayValue('10:30 AM')).toBeInTheDocument();
		await expect(dialog.getByRole('textbox', { name: t.scheduleDuration })).toHaveValue('60');
	},
};

/** An optional count offers a clear button, and clearing it leaves the field showing what empty means. */
export const ClearingAutoCloseLeavesItEmpty: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.scheduleAddOneOff }));

		const dialog = within(await within(document.body).findByRole('dialog'));

		await userEvent.click(dialog.getByRole('button', { name: t.scheduleClearAutoClose }));

		await expect(dialog.getByPlaceholderText(t.scheduleAutoCloseNever)).toHaveValue('');
		await expect(dialog.queryByRole('button', { name: t.scheduleClearAutoClose })).toBeNull();
		await expect(dialog.getByRole('button', { name: t.scheduleSave })).toBeEnabled();
	},
};

export const StartNowAsksFirst: Story = {
	play: async ({ canvas }) => {
		const grid = await canvas.findByRole('grid', { name: t.scheduleGridLabel });
		const pendingRow = (await within(grid).findByText('Pending')).closest('[role="row"]')!;

		await userEvent.click(within(pendingRow as HTMLElement).getByRole('menuitem'));
		await userEvent.click(
			await within(document.body).findByRole('menuitem', { name: t.scheduleStartNow }),
		);

		const sheet = within(await within(document.body).findByRole('alertdialog'));

		await expect(sheet.getByText(t.scheduleConfirmStartNow)).toBeInTheDocument();
	},
};
