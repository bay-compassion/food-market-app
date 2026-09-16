import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { guestAdmissions } from '../../services/guestAdmission';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { queueGuest } from './queueGuests.fixture';
import { SessionView, type SessionViewProps } from './SessionView';
import type { AdminMarketEvent } from './types';

const t = adminTranslations.en;
const event: AdminMarketEvent = {
	id: 'session-story',
	registrationOpensAt: '2026-09-03T17:00:00Z',
	registrationClosesAt: '2026-09-03T18:00:00Z',
	capacity: 50,
	status: 'scheduled',
};

const meta = {
	title: 'Admin/SessionView',
	component: SessionView,
	parameters: { shell: 'admin' },
	args: {
		event: null,
		sessionState: 'inactive',
		counts: {},
		statusLabels: adminVisitStatusLabels('en'),
		registeredGuests: [queueGuest({ status: 'registered', queuePosition: null })],
		admissions: guestAdmissions,
		busy: false,
		extensionMinutes: 15,
		postponementMinutes: 15,
		onExtensionMinutesChange: fn(),
		onPostponementMinutesChange: fn(),
		onPostponeRegistration: fn(),
		onExtendRegistration: fn(),
		onSaveCapacityOverride: fn(),
		onRun: fn(),
		onAddGuest: fn(),
		onNavigateQueue: fn(),
	},
	render: function SessionStory(args: SessionViewProps) {
		const [extensionMinutes, setExtensionMinutes] = useState(args.extensionMinutes);
		const [postponementMinutes, setPostponementMinutes] = useState(args.postponementMinutes);

		return (
			<SessionView
				{...args}
				extensionMinutes={extensionMinutes}
				onExtensionMinutesChange={setExtensionMinutes}
				postponementMinutes={postponementMinutes}
				onPostponementMinutesChange={setPostponementMinutes}
			/>
		);
	},
} satisfies Meta<typeof SessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByText(t.noSessionHelp)).toBeInTheDocument();
	},
};

export const Scheduled: Story = {
	args: { event, sessionState: 'scheduled' },
};

export const RegistrationOpen: Story = {
	args: {
		event: { ...event, status: 'registration_open' },
		sessionState: 'registration_open',
	},
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.queryByRole('button', { name: t.runLottery })).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: t.closeRegistration }));
		await expect(args.onRun).toHaveBeenCalledWith('close_registration');
	},
};

export const RegistrationClosed: Story = {
	args: {
		event: { ...event, status: 'registration_closed' },
		sessionState: 'registration_closed',
	},
	play: async ({ canvas, userEvent, args }) => {
		await userEvent.click(canvas.getByRole('button', { name: t.reopenRegistration }));
		await expect(args.onRun).toHaveBeenCalledWith('reopen_registration');
	},
};

export const LotteryPending: Story = {
	args: {
		event: { ...event, status: 'lottery_pending' },
		sessionState: 'lottery_pending',
	},
	play: async ({ canvas, userEvent, args }) => {
		await userEvent.click(canvas.getByRole('button', { name: t.runLottery }));
		await expect(args.onRun).toHaveBeenCalledWith('run_lottery');
	},
};

export const ServiceStarted: Story = {
	args: {
		event: { ...event, status: 'service_started' },
		sessionState: 'service_started',
		counts: { waiting: 20, called: 5, served: 10, not_placed: 3 },
	},
};

export const Busy: Story = {
	args: { ...RegistrationOpen.args, busy: true },
	play: async ({ canvas }) => {
		const stepper = within(canvas.getByLabelText(t.currentSession));

		for (const button of stepper.getAllByRole('button')) {
			await expect(button).toBeDisabled();
		}
	},
};
