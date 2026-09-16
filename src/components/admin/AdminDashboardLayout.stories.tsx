import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

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
 * The frame every admin screen renders inside: the tab strip, the heading, and the session's
 * status. It reads all of that from the root store, so a story seeds a store — through a mocked
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
	return (
		<AdminDashboardLayout activeView={activeView} onNavigate={() => {}}>
			<p>Screen content goes here.</p>
		</AdminDashboardLayout>
	);
}

const meta = {
	title: 'Admin/AdminDashboardLayout',
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
	args: { activeView: 'queue', sessionStatus: SessionStatusEnum.SERVICE_STARTED },
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

/** A screen with no session status of its own to report. */
export const Reports: Story = {
	args: { activeView: 'reports' },
};

/** A worker whose role opens nothing. The frame says so rather than rendering an empty page. */
export const NoAccess: Story = {
	args: { permissions: [] },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(t.noAccess)).toBeVisible();
	},
};
