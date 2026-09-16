import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { guestAdmissions } from '../../services/guestAdmission';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
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
	title: 'Admin/Current Session/SessionView',
	component: SessionView,
	parameters: { shell: 'admin' },
	args: {
		event: null,
		sessionState: 'inactive',
		counts: {},
		statusLabels: adminVisitStatusLabels('en'),
		sessionGuests: [queueGuest({ status: 'registered', queuePosition: null })],
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
		onNavigateSchedule: fn(),
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
		await expect(canvas.getByRole('button', { name: t.scheduleOpenSchedule })).toBeInTheDocument();
		await expect(canvas.queryByLabelText(t.currentSession)).not.toBeInTheDocument();
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
	decorators: [
		(Story) => {
			const store = new RootStore();

			store.session.applyServerState({
				event: {
					...event,
					status: SessionStatusEnum.REGISTRATION_CLOSED,
					registrationGraceEndsAt: new Date(Date.now() + 30_000).toISOString(),
				},
				questions: [],
				counts: {},
			});

			return (
				<RootStoreProvider store={store}>
					<Story />
					<ConfirmationDrawer />
				</RootStoreProvider>
			);
		},
	],
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.getByRole('timer')).toHaveTextContent(t.graceCountdown.split('{time}')[0]!);
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

/**
 * An automatic draw: the card says when it runs and offers to run it now or push it back. The card
 * reads the draw time from the session store, so this story seeds one of its own.
 */
export const AutomaticLotteryPending: Story = {
	args: LotteryPending.args,
	decorators: [
		(Story) => {
			const store = new RootStore();

			store.session.applyServerState({
				event: {
					id: event.id,
					status: SessionStatusEnum.LOTTERY_PENDING,
					capacity: event.capacity,
					registrationOpensAt: event.registrationOpensAt,
					registrationClosesAt: event.registrationClosesAt,
					lotteryDelayMinutes: 10,
					lotteryDrawsAt: new Date(Date.now() + 600_000).toISOString(),
				},
				questions: [],
				counts: {},
			});

			return (
				<RootStoreProvider store={store}>
					<Story />
					<ConfirmationDrawer />
				</RootStoreProvider>
			);
		},
	],
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('timer')).toHaveTextContent(
			t.lotteryCountdown.split('{time}')[0]!,
		);
		await expect(canvas.getByRole('button', { name: t.pauseLottery })).toBeEnabled();
		await expect(canvas.getByRole('button', { name: t.runLotteryNow })).toBeEnabled();
		await expect(
			canvas.getByRole('button', { name: t.postponeLotteryBy.replace('{minutes}', '10') }),
		).toBeEnabled();
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

export const RegistrationSections: Story = {
	args: {
		...RegistrationOpen.args,
		sessionGuests: [
			queueGuest({ id: 'registered', firstName: 'Ada', status: 'registered', queuePosition: null }),
			queueGuest({ id: 'cancelled', firstName: 'Grace', status: 'cancelled', queuePosition: null }),
		],
	},
	play: async ({ canvas, userEvent }) => {
		const registered = canvas.getByRole('button', { name: `${t.registered} 1` });
		const cancelled = canvas.getByRole('button', { name: `${t.cancelled} 1` });

		await expect(canvas.getByRole('table', { name: t.registered })).toHaveTextContent('Ada');
		await expect(canvas.getByRole('table', { name: t.cancelled })).toHaveTextContent('Grace');
		await userEvent.click(cancelled);
		await expect(cancelled).toHaveAttribute('aria-expanded', 'false');
		await expect(canvas.queryByRole('table', { name: t.cancelled })).not.toBeInTheDocument();
		await expect(registered).toHaveAttribute('aria-expanded', 'true');
		await userEvent.click(cancelled);
		await expect(canvas.getByRole('table', { name: t.cancelled })).toHaveTextContent('Grace');
	},
};
