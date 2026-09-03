import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { guestAdmissions } from '../../services/guestAdmission';
import { defaultSessionSettings } from '../../services/session-settings';
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
	sessionMode: 'scheduled',
	status: 'scheduled',
};

const meta = {
	title: 'Admin/SessionView',
	component: SessionView,
	parameters: { shell: 'admin' },
	args: {
		event: null,
		sessionState: 'inactive',
		settings: defaultSessionSettings(new Date('2026-09-03T16:00:00Z')),
		statuses: ['waiting', 'called', 'served', 'registered', 'not_placed'],
		counts: {},
		statusLabels: adminVisitStatusLabels('en'),
		registeredGuests: [queueGuest({ status: 'registered', queuePosition: null })],
		admissions: guestAdmissions,
		busy: false,
		extensionMinutes: 15,
		postponementMinutes: 15,
		broadcast: { title: '', body: '' },
		onSettingsChange: fn(),
		onExtensionMinutesChange: fn(),
		onPostponementMinutesChange: fn(),
		onBroadcastChange: fn(),
		onSaveSettings: fn(),
		onSaveAndStartRegistration: fn(),
		onPostponeRegistration: fn(),
		onExtendRegistration: fn(),
		onSaveCapacityOverride: fn(),
		onRun: fn(),
		onAddGuest: fn(),
		onSendBroadcast: fn(),
		onNavigateQueue: fn(),
	},
	render: function SessionStory(args: SessionViewProps) {
		const [settings, setSettings] = useState(args.settings);
		const [extensionMinutes, setExtensionMinutes] = useState(args.extensionMinutes);
		const [postponementMinutes, setPostponementMinutes] = useState(args.postponementMinutes);
		const [broadcast, setBroadcast] = useState(args.broadcast);

		return (
			<SessionView
				{...args}
				settings={settings}
				onSettingsChange={setSettings}
				extensionMinutes={extensionMinutes}
				onExtensionMinutesChange={setExtensionMinutes}
				postponementMinutes={postponementMinutes}
				onPostponementMinutesChange={setPostponementMinutes}
				broadcast={broadcast}
				onBroadcastChange={setBroadcast}
			/>
		);
	},
} satisfies Meta<typeof SessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Setup: Story = {};

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

export const AdHocRegistration: Story = {
	args: {
		...RegistrationOpen.args,
		event: { ...event, status: 'registration_open', sessionMode: 'ad_hoc' },
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
