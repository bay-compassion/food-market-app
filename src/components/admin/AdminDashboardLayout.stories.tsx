import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Permission } from '../../services/permissions';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { AdminDashboardLayout } from './AdminDashboardLayout';
import type { AdminView } from './types';

const t = adminTranslations.en;
const originalFetch = window.fetch.bind(window);

/**
 * The frame every admin screen renders inside: the navigation, the title, the screen's one-line
 * summary, and the session's status. On a phone the title is also the view switcher, opening a
 * sheet of every screen the worker can open; past 860px the same list sits in a sidebar. It reads all of that from the root store, so a story seeds a store — through a mocked
 * `/api/market` and an injected permission reader — rather than passing the values as props.
 *
 * This is the only way to see the frame at all: `/admin` is behind Auth0, so the running app
 * cannot reach it locally.
 */
type AdminDashboardLayoutArgs = {
	activeView: AdminView;
	sessionStatus: SessionStatusEnum | null;
	permissions: Permission[];
};

const everyPermission: Permission[] = [
	'manage:sessions',
	'run:queue',
	'read:reports',
	'export:guest-data',
];

function marketResponse(status: SessionStatusEnum | null) {
	return Response.json({
		event:
			status === null
				? null
				: {
						id: 'story-market',
						registrationOpensAt: '2026-09-06T16:00:00.000Z',
						registrationClosesAt: '2026-09-06T17:00:00.000Z',
						capacity: 120,
						status,
					},
		questions: [],
		counts: {},
	});
}

const withSeededStore: Decorator = (Story, context) => {
	const { sessionStatus, permissions } = context.args as AdminDashboardLayoutArgs;

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url === '/api/market') {
			return Promise.resolve(marketResponse(sessionStatus));
		}

		return url.startsWith('/api/admin/')
			? Promise.resolve(Response.json([]))
			: originalFetch(input, init);
	};

	const store = new RootStore();

	store.setPermissionReader(() => Promise.resolve(permissions));
	void store.admin.load();

	return (
		<RootStoreProvider store={store}>
			<Story />
		</RootStoreProvider>
	);
};

function Layout({ activeView }: AdminDashboardLayoutArgs) {
	const [view, setView] = useState(activeView);

	return (
		<AdminDashboardLayout activeView={view} onNavigate={setView}>
			<p>Screen content goes here.</p>
		</AdminDashboardLayout>
	);
}

const meta = {
	title: 'Admin/Shared/Dashboard Layout',
	component: Layout,
	parameters: { shell: 'bare' },
	decorators: [withSeededStore],
	args: {
		activeView: 'current-session',
		sessionStatus: SessionStatusEnum.REGISTRATION_OPEN,
		permissions: everyPermission,
	},
} satisfies Meta<typeof Layout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Registration is open, which is the status a worker most often opens the dashboard to check. */
export const RegistrationOpen: Story = {
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.open)).toBeVisible();
		await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(t.currentSession);
	},
};

/** Service under way: the status a worker running the queue needs to see without hunting. */
export const ServiceStarted: Story = {
	args: {
		activeView: 'queue',
		sessionStatus: SessionStatusEnum.SERVICE_STARTED,
	},
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.serviceStarted)).toBeVisible();
	},
};

/** No session configured at all — the state the dashboard opens in between market days. */
export const NoActiveSession: Story = {
	args: { sessionStatus: null },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.noActiveSession)).toBeVisible();
	},
};

/** A desk screen. The session's status still sits beside its title, as it does on every screen. */
export const Reports: Story = {
	args: { activeView: 'reports' },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.open)).toBeVisible();
		await expect(canvas.getByText(t.viewDescriptions.reports)).toBeVisible();
	},
};

/** A worker whose role opens nothing. The frame says so rather than rendering an empty page. */
export const NoAccess: Story = {
	args: { permissions: [] },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.noAccess)).toBeVisible();
	},
};

/** The view switcher's sheet: every screen, under the headings that say what each is for. */
export const SwitchingViews: Story = {
	play: async ({ canvas }) => {
		const title = await canvas.findByRole('button', {
			name: t.currentSession,
		});

		await userEvent.click(title);

		const sheet = within(
			await within(document.body).findByRole('dialog', {
				name: t.switchView,
			}),
		);

		for (const group of Object.values(t.viewGroups)) {
			await expect(sheet.getByRole('heading', { name: group })).toBeVisible();
		}

		await expect(sheet.getByRole('button', { name: t.currentSession })).toHaveAttribute(
			'aria-current',
			'page',
		);
		await userEvent.click(sheet.getByRole('button', { name: t.reports }));
		await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(t.reports);
		await expect(canvas.getByText(t.viewDescriptions.reports)).toBeVisible();
	},
};

/** A queue worker opens three screens, which read at a glance with no headings over them. */
export const QueueWorker: Story = {
	args: {
		activeView: 'queue',
		sessionStatus: SessionStatusEnum.SERVICE_STARTED,
		permissions: ['run:queue'],
	},
	play: async ({ canvas }) => {
		await userEvent.click(await canvas.findByRole('button', { name: t.queue }));

		const sheet = within(
			await within(document.body).findByRole('dialog', {
				name: t.switchView,
			}),
		);

		await expect(sheet.getAllByRole('button').map((button) => button.textContent)).toEqual([
			t.queue,
			t.guestDatabase,
			t.historySessions,
		]);

		for (const group of Object.values(t.viewGroups)) {
			await expect(sheet.queryByRole('heading', { name: group })).not.toBeInTheDocument();
		}
	},
};

/** Past 860px the navigation leaves the sheet for a sidebar, and the title is a plain heading. */
export const Wide: Story = {
	globals: { viewport: { value: 'ipad12p', isRotated: false } },
	play: async ({ canvas }) => {
		const navigation = within(await canvas.findByRole('navigation', { name: t.adminTitle }));

		await expect(navigation.getByRole('button', { name: t.currentSession })).toHaveAttribute(
			'aria-current',
			'page',
		);
		await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(t.currentSession);
		await expect(
			within(canvas.getByRole('heading', { level: 1 })).queryByRole('button'),
		).not.toBeInTheDocument();
	},
};

/**
 * A screen the worker's role does not open, as a URL typed by hand can ask for. Nothing in the
 * navigation is marked current, rather than marking a screen the worker is not on.
 */
export const ScreenOutsideTheRole: Story = {
	args: { activeView: 'dev-mode', permissions: ['run:queue'] },
	globals: { viewport: { value: 'ipad12p', isRotated: false } },
	play: async ({ canvas }) => {
		const navigation = within(await canvas.findByRole('navigation', { name: t.adminTitle }));

		await expect(await navigation.findByRole('button', { name: t.queue })).toBeVisible();
		await expect(
			navigation.queryAllByRole('button').filter((button) => button.hasAttribute('aria-current')),
		).toHaveLength(0);
	},
};
