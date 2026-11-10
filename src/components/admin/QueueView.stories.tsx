import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Permission } from '../../services/permissions';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { numberedQueue, seededQueueStore } from '../queue/seeded-queue.fixture';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { AdminDashboardLayout } from './AdminDashboardLayout';
import { QueueView } from './QueueView';

const t = adminTranslations.en;

type QueueViewArgs = {
	sessionStatus: SessionStatusEnum;
	permissions: Permission[];
	/** Inside the dashboard's own frame — its heading, and the tab bar or sidebar — as it runs. */
	inDashboard?: boolean;
};

function SeededQueueView({ sessionStatus, permissions, inDashboard }: QueueViewArgs) {
	// Built once per set of args, so a re-render of the page around it keeps the same line.
	const [store] = useState(() => {
		const seeded = seededQueueStore({ guests: numberedQueue, sessionStatus, permissions });

		// The frame shows a screen only once it knows the worker may open one, as the dashboard does.
		void seeded.admin.loadPermissions();

		return seeded;
	});
	const queue = <QueueView onNavigateCurrentSession={fn()} />;

	return (
		<RootStoreProvider store={store}>
			{inDashboard ? (
				<AdminDashboardLayout activeView="queue" onNavigate={fn()}>
					{queue}
				</AdminDashboardLayout>
			) : (
				queue
			)}
			{/* The decorator's sheet and toasts read its own store, not this seeded one. */}
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

/**
 * The dashboard's Queue tab. Once service runs it is the queue desk's own line — the same lists,
 * ticket, and call button as `/queue` (see Staff/Queue Desk/Line for those in depth) — under the
 * dashboard's heading, with the call bar sitting on the tab bar rather than the bottom edge.
 *
 * The tab bar itself belongs to the dashboard, so it is not drawn here: on a phone, picture it
 * under the call bar.
 */
const meta = {
	title: 'Admin/Queue/Queue',
	component: SeededQueueView,
	parameters: { shell: 'admin' },
	render: (args) => <SeededQueueView key={JSON.stringify(args)} {...args} />,
	args: {
		sessionStatus: SessionStatusEnum.SERVICE_STARTED,
		permissions: ['run:queue'],
	},
} satisfies Meta<typeof SeededQueueView>;

export default meta;

type Story = StoryObj<typeof meta>;

const deskViewport = { viewport: { value: 'ipad12p', isRotated: false } };

/** Service under way: guests called, guests waiting, and a few already through. */
export const DuringService: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('button', { name: /^Call next/ })).toBeVisible();
		// One guest at a time: there is no count to call several at once.
		await expect(canvas.queryByRole('spinbutton')).toBeNull();
	},
};

/**
 * A manager opens a guest's ticket. Beside the visit's commands is the code that puts the guest on
 * a phone, which used to be only in the dashboard row's menu.
 */
export const TicketOpenForAManager: Story = {
	args: { permissions: ['run:queue', 'manage:guest-access'] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const [ticket] = await canvas.findAllByRole('button', { name: /^Open ticket / });

		await userEvent.click(ticket!);

		const sheet = within(await canvas.findByRole('region', { name: t.queueDesk.ticket }));

		await expect(sheet.getByRole('button', { name: t.guestClaimShow })).toBeVisible();
	},
};

/** The rarer actions: the standalone queue screen, a room display's code, closing the session. */
export const ActionsMenuOpen: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(await canvas.findByRole('button', { name: t.queueDesk.actions }));

		const menu = within(await within(document.body).findByRole('menu'));

		await expect(menu.getByRole('menuitem', { name: t.queueDesk.openQueueDesk })).toBeVisible();
	},
};

/**
 * Before service: the tab is only a way back to the session screen, where service is started, and
 * to unlocking a room display.
 */
export const BeforeServiceStarts: Story = {
	args: { sessionStatus: SessionStatusEnum.REGISTRATION_CLOSED },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('button', { name: t.goToCurrentSession })).toBeVisible();
	},
};

/** On a desk-sized screen: the line and the open ticket side by side, as on `/queue`. */
export const AtTheDesk: Story = {
	globals: deskViewport,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			await canvas.findByRole('complementary', { name: t.queueDesk.ticket }),
		).toBeVisible();
	},
};

/**
 * In the dashboard's frame on a phone: the call bar sits on the tab bar, and an open ticket docks
 * on the call bar.
 */
export const InTheDashboard: Story = {
	args: { inDashboard: true },
	// The frame brings its own `.admin-dashboard`.
	parameters: { shell: 'bare' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('button', { name: /^Call next/ })).toBeVisible();
	},
};

/**
 * In the dashboard's frame on a desk: the tab takes the wide width and the window's height, so the
 * line and the ticket each scroll on their own, under the heading and beside the sidebar.
 */
export const InTheDashboardAtTheDesk: Story = {
	args: { inDashboard: true },
	parameters: { shell: 'bare' },
	globals: deskViewport,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			await canvas.findByRole('complementary', { name: t.queueDesk.ticket }),
		).toBeVisible();
	},
};
