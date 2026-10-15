import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { SessionHistoryView } from './SessionHistoryView';
import type { HistoricalEvent } from './types';

const t = adminTranslations.en;

function pastSession(day: number, guestCount: number): HistoricalEvent {
	return {
		id: `session-${day}`,
		registrationOpensAt: `2026-10-${day}T17:30:00.000Z`,
		registrationClosesAt: `2026-10-${day}T17:45:00.000Z`,
		capacity: 12,
		status: SessionStatusEnum.ENDED,
		guestCount,
	};
}

/**
 * Past sessions, newest first, under the month they ran in. Each one can still take an
 * after-the-fact record of a guest served outside the app, from its row's menu, which opens the
 * add-guest dialog limited to that.
 */
const meta = {
	title: 'Admin/Session History/History List',
	component: SessionHistoryView,
	parameters: { shell: 'admin' },
	args: {
		history: [pastSession(24, 31), pastSession(17, 22), pastSession(10, 26)],
		busy: false,
		onAddGuest: fn(),
	},
} satisfies Meta<typeof SessionHistoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Each session says it is closed — a status, not the command that closes one. */
export const PastSessions: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getAllByText(t.sessionClosed)).toHaveLength(3);
		await expect(canvas.queryByText(t.closeSession)).not.toBeInTheDocument();
		await expect(canvas.getByRole('heading', { name: /October 2026/ })).toBeVisible();
	},
};

/** Recording a guest served outside the app, from the session's own menu. */
export const RecordingAServedGuest: Story = {
	play: async ({ canvas }) => {
		const [firstMenu] = canvas.getAllByRole('button', { name: new RegExp(t.sessionActions) });

		await userEvent.click(firstMenu!);
		await userEvent.click(
			await within(document.body).findByRole('menuitem', { name: t.recordServedGuest }),
		);
		await expect(
			await within(document.body).findByRole('dialog', { name: t.manualGuestTitle }),
		).toBeVisible();
	},
};

/** Between market days with nothing on record yet. */
export const NoHistory: Story = {
	args: { history: [] },
	play: async ({ canvas }) => {
		await expect(canvas.getByText(t.noHistory)).toBeVisible();
	},
};
