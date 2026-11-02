import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { guestAdmissions } from '../../services/guestAdmission';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import type { SessionEvent } from '../../stores/market-session.store';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { queueGuest } from './queueGuests.fixture';
import { SessionView, type SessionViewProps } from './SessionView';

const t = adminTranslations.en;
const event: SessionEvent = {
	id: 'session-story',
	registrationOpensAt: '2026-10-31T17:30:00Z',
	registrationClosesAt: '2026-10-31T17:45:00Z',
	capacity: 12,
	status: SessionStatusEnum.SCHEDULED,
};

type SeededSession = {
	event: Partial<SessionEvent> | null;
	counts?: Partial<Record<VisitStatus, number>>;
};

type SessionStoryArgs = SessionViewProps & SeededSession;

/** Today reads the session from the store, so each story seeds a store of its own. */
function SeededSessionView({ event: seeded, counts = {}, ...props }: SessionStoryArgs) {
	const [store] = useState(() => {
		const root = new RootStore();

		root.session.applyServerState({
			event: seeded && { ...event, ...seeded },
			questions: [],
			counts,
		});

		return root;
	});

	return (
		<RootStoreProvider store={store}>
			<SessionView {...props} />
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Today/Session Overview',
	component: SeededSessionView,
	parameters: { shell: 'admin' },
	args: {
		event: null,
		counts: {},
		statusLabels: adminVisitStatusLabels('en'),
		sessionGuests: [queueGuest({ status: 'registered', queuePosition: null })],
		admissions: guestAdmissions,
		busy: false,
		onRun: fn(),
		onAddGuest: fn(),
		onNavigate: fn(),
	},
} satisfies Meta<typeof SeededSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.queryByRole('list', { name: t.today.timelineLabel })).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: t.scheduleOpenSchedule }));
		await expect(args.onNavigate).toHaveBeenCalledWith('schedule');
	},
};

/** Nothing is needed yet, so the only thing to read is when something will happen by itself. */
export const Scheduled: Story = {
	args: { event: { status: SessionStatusEnum.SCHEDULED, lotteryDelayMinutes: 0 } },
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.getByText(t.today.nothingToDoYet)).toBeVisible();
		await expect(canvas.getByText(t.today.milestones.registration_opens.next)).toBeVisible();
		await expect(canvas.queryByRole('button', { name: t.today.somethingWrong })).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: t.today.setUpRoomDisplay }));
		await expect(args.onNavigate).toHaveBeenCalledWith('checklist');
		await userEvent.click(canvas.getByRole('button', { name: t.openRegistrationNow }));
		await expect(args.onRun).toHaveBeenCalledWith('open_registration');
	},
};

export const RegistrationOpen: Story = {
	args: {
		event: {
			status: SessionStatusEnum.REGISTRATION_OPEN,
			registrationClosesAt: new Date(Date.now() + 492_000).toISOString(),
			lotteryDelayMinutes: 0,
		},
		counts: { registered: 16 },
	},
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.queryByRole('button', { name: t.runLottery })).toBeNull();
		await expect(canvas.getByRole('timer')).toBeVisible();
		await expect(canvas.getByText(t.today.milestones.registration_opens.done)).toBeVisible();
		await userEvent.click(canvas.getByRole('button', { name: t.closeRegistration }));
		await expect(args.onRun).toHaveBeenCalledWith('close_registration');
	},
};

/** Any number of minutes goes through the sheet, which names the new time on its button. */
export const CustomExtension: Story = {
	args: {
		event: {
			status: SessionStatusEnum.REGISTRATION_OPEN,
			registrationClosesAt: new Date(Date.now() + 492_000).toISOString(),
		},
	},
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: t.today.custom }));

		const sheet = within(await within(document.body).findByRole('dialog'));

		await expect(sheet.getByRole('heading', { name: t.today.extendRegistration })).toBeVisible();
		await expect(
			sheet.getByRole('button', {
				name: new RegExp(t.today.customExtendAction.replace('{time}', '')),
			}),
		).toBeEnabled();
		await userEvent.click(sheet.getByRole('button', { name: t.cancel }));
	},
};

export const RegistrationClosed: Story = {
	args: {
		event: {
			status: SessionStatusEnum.REGISTRATION_CLOSED,
			registrationGraceEndsAt: new Date(Date.now() + 30_000).toISOString(),
		},
	},
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.getByRole('timer')).toBeVisible();
		await userEvent.click(canvas.getByRole('button', { name: t.reopenRegistration }));
		await expect(args.onRun).toHaveBeenCalledWith('reopen_registration');
	},
};

/** With nothing scheduled to run the draw, running it is the one thing the screen asks for. */
export const LotteryPending: Story = {
	args: {
		event: { status: SessionStatusEnum.LOTTERY_PENDING },
		counts: { registered: 16 },
	},
	play: async ({ canvas, userEvent, args }) => {
		await expect(canvas.getByText(t.today.whenYouRunIt)).toBeVisible();
		await userEvent.click(canvas.getByRole('button', { name: t.runLottery }));
		await expect(args.onRun).toHaveBeenCalledWith('run_lottery');
	},
};

/** The draw runs by itself; running it now is a quieter choice under the ways to delay it. */
export const AutomaticLotteryPending: Story = {
	args: {
		event: {
			status: SessionStatusEnum.LOTTERY_PENDING,
			lotteryDelayMinutes: 10,
			lotteryDrawsAt: new Date(Date.now() + 102_000).toISOString(),
		},
		counts: { registered: 16 },
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('timer')).toBeVisible();
		await expect(canvas.getByRole('button', { name: t.pauseLottery })).toBeEnabled();
		await expect(canvas.getByRole('button', { name: t.runLotteryNow })).toBeEnabled();
		await expect(
			canvas.getByRole('button', { name: t.postponeLotteryBy.replace('{minutes}', '10') }),
		).toBeEnabled();
	},
};

/** Closing is how a normal day ends. Reset is not, so it stays folded away until asked for. */
export const ServiceStarted: Story = {
	args: {
		event: { status: SessionStatusEnum.SERVICE_STARTED },
		counts: { waiting: 4, called: 2, served: 5, no_show: 1, not_placed: 4 },
	},
	play: async ({ canvas, userEvent, args }) => {
		await userEvent.click(canvas.getByRole('button', { name: t.goToQueue }));
		await expect(args.onNavigate).toHaveBeenCalledWith('queue');
		await userEvent.click(canvas.getByRole('button', { name: t.closeSession }));
		await expect(args.onRun).toHaveBeenCalledWith('close_session');
		await expect(canvas.queryByRole('button', { name: t.resetSession })).toBeNull();
		await userEvent.click(canvas.getByRole('button', { name: t.today.somethingWrong }));
		await userEvent.click(canvas.getByRole('button', { name: t.resetSession }));
		await expect(args.onRun).toHaveBeenCalledWith('reset_session');
	},
};

export const Busy: Story = {
	args: { ...RegistrationOpen.args, busy: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: t.closeRegistration })).toBeDisabled();
		await expect(canvas.getByRole('button', { name: t.today.custom })).toBeDisabled();
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
