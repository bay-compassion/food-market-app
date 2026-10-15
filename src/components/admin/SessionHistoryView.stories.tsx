import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

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
 * Past sessions, newest first. Each one can still take an after-the-fact record of a guest served
 * outside the app, which opens the add-guest dialog limited to that.
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
	},
};

/** Between market days with nothing on record yet. */
export const NoHistory: Story = {
	args: { history: [] },
	play: async ({ canvas }) => {
		await expect(canvas.getByText(t.noHistory)).toBeVisible();
	},
};
