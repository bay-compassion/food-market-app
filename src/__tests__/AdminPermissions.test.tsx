import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The real module only configures Auth0 when the VITE_AUTH0_* variables are set, which is true on
// some machines and not others. Pin it on so these tests always take the read-the-token path.
vi.mock('../auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../auth')>()),
	auth0Settings: null,
	isAuth0Configured: true,
}));

import { adminTranslations } from '../adminLocales';
import { AdminDashboard } from '../components/AdminDashboard';
import { ConfirmationDrawer } from '../components/ui/ConfirmationDrawer';
import type { AdminView } from '../services/admin-views';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';
import { answerConfirmation } from './render-with-app';

const t = adminTranslations.en;

/** An unsigned token carrying permissions — all the admin screens read one for. */
function tokenWith(permissions: string[]) {
	const segment = (value: unknown) =>
		btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	return `${segment({ alg: 'none', typ: 'JWT' })}.${segment({ permissions })}.`;
}

function renderDashboard(
	permissions: string[],
	{ view, status = null }: { view?: AdminView; status?: SessionStatusEnum | null } = {},
) {
	const event = status
		? {
				id: 'event-1',
				status,
				registrationOpensAt: '2026-09-03T17:00:00Z',
				registrationClosesAt: '2026-09-03T18:00:00Z',
				capacity: 50,
			}
		: null;

	// Answers each endpoint with its own shape, so a screen that opens actually renders.
	vi.stubGlobal(
		'fetch',
		vi.fn((url: string) =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url === '/api/market' || url === '/api/admin/market/overview'
							? { event, questions: [], counts: {} }
							: url.startsWith('/api/admin/reports')
								? { rows: [] }
								: [],
					),
			} as Response),
		),
	);

	const onNavigate = vi.fn();
	const store = new RootStore();
	const result = render(
		<RootStoreProvider store={store}>
			<AdminDashboard
				view={view}
				getAccessToken={() => Promise.resolve(tokenWith(permissions))}
				onNavigate={onNavigate}
			/>
			<ConfirmationDrawer />
		</RootStoreProvider>,
	);

	return { ...result, onNavigate, store };
}

/**
 * On a phone — which is what jsdom's media queries report — the screens are listed in a sheet the
 * title opens, so reading them means opening it first. Waits for the title to become a switcher,
 * which happens once the worker's permissions have resolved to at least one screen.
 */
async function openNavigation(container: HTMLElement) {
	const switcher = await waitFor(() => {
		const button = container.querySelector<HTMLButtonElement>('h1 button');

		if (!button) {
			throw new Error('The view switcher has not rendered yet.');
		}

		return button;
	});

	await userEvent.setup().click(switcher);

	return document.body.querySelector<HTMLElement>('.admin-navigation')!;
}

async function navigationLabels(container: HTMLElement) {
	const navigation = await openNavigation(container);

	return Array.from(navigation.querySelectorAll('button')).map((button) => button.textContent);
}

async function navigateTo(container: HTMLElement, label: string) {
	const navigation = await openNavigation(container);

	await userEvent.setup().click(within(navigation).getByRole('button', { name: label }));
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('admin navigation by permission', () => {
	it('offers a queue worker only the screens their role can open', async () => {
		const { container } = renderDashboard(['run:queue']);

		expect(await navigationLabels(container)).toEqual([
			t.queue,
			t.guestDatabase,
			t.historySessions,
		]);
	});

	it('offers an administrator everything', async () => {
		const { container } = renderDashboard([
			'run:queue',
			'manage:sessions',
			'read:reports',
			'export:guest-data',
		]);

		expect(await navigationLabels(container)).toEqual([
			t.currentSession,
			t.queue,
			t.broadcastTitle,
			t.schedule,
			t.questionBank,
			t.guestDatabase,
			t.historySessions,
			t.reports,
		]);
	});

	it('lands a worker on a screen they can open, not the default one they cannot', async () => {
		const { onNavigate } = renderDashboard(['run:queue']);

		// `current-session` is the default view but needs manage:sessions.
		await waitFor(() => expect(onNavigate.mock.calls[0]).toEqual(['queue']));
	});

	it('explains itself to someone signed in with no role at all', async () => {
		const { container } = renderDashboard([]);

		await waitFor(() => expect(container.textContent).toContain(t.noAccess));
		expect(container.querySelector('h1 button')).toBeNull();
		expect(document.body.querySelector('.admin-navigation')).toBeNull();
	});

	it('does not request guest data a worker has no permission to read', async () => {
		const { container } = renderDashboard(['read:reports']);

		expect(await navigationLabels(container)).toEqual([t.reports]);

		const urls = vi
			.mocked(fetch)
			.mock.calls.map(([input]) => (input instanceof Request ? input.url : input.toString()));

		expect(urls.some((url) => url.startsWith('/api/admin/guests'))).toBe(false);
	});

	// manage:demo-data is deliberately not part of `worker` or `admin` — see docs/roles.md — so an
	// administrator holding the other four permissions should not see it either.
	it('offers the dev-mode screen only to whoever holds manage:demo-data', async () => {
		const { container } = renderDashboard(['manage:demo-data']);

		expect(await navigationLabels(container)).toEqual([t.devMode]);
	});
});

describe('broadcast notification screen', () => {
	it('opens its own screen and preserves a draft across screen switches', async () => {
		// Arrange
		const user = userEvent.setup();
		const screen = renderDashboard(['manage:sessions'], {
			status: SessionStatusEnum.REGISTRATION_OPEN,
		});

		expect(screen.queryByLabelText(t.broadcastTitleLabel)).toBeNull();

		// Act
		await navigateTo(screen.container, t.broadcastTitle);
		await user.type(screen.getByLabelText(t.broadcastTitleLabel), 'Doors open');
		await user.type(screen.getByLabelText(t.broadcastMessageLabel), 'Come on in');
		await navigateTo(screen.container, t.currentSession);
		expect(screen.queryByLabelText(t.broadcastTitleLabel)).toBeNull();
		await navigateTo(screen.container, t.broadcastTitle);

		// Assert
		expect(screen.onNavigate).toHaveBeenLastCalledWith('broadcast');
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(t.broadcastTitle);
		expect((screen.getByLabelText(t.broadcastTitleLabel) as HTMLInputElement).value).toBe(
			'Doors open',
		);
		expect((screen.getByLabelText(t.broadcastMessageLabel) as HTMLTextAreaElement).value).toBe(
			'Come on in',
		);
	});

	it.each([
		SessionStatusEnum.REGISTRATION_OPEN,
		SessionStatusEnum.REGISTRATION_CLOSED,
		SessionStatusEnum.LOTTERY_PENDING,
		SessionStatusEnum.SERVICE_STARTED,
	])('supports opening the broadcast route during %s', async (status) => {
		// Arrange / Act
		const screen = renderDashboard(['manage:sessions'], { view: 'broadcast', status });

		// Assert
		expect(await screen.findByLabelText(t.broadcastTitleLabel)).not.toBeNull();
		expect(screen.onNavigate).not.toHaveBeenCalled();
	});

	it.each([null, SessionStatusEnum.SCHEDULED, SessionStatusEnum.ENDED])(
		'explains why broadcasts are unavailable during %s',
		async (status) => {
			// Arrange / Act
			const screen = renderDashboard(['manage:sessions'], { view: 'broadcast', status });

			// Assert
			expect(await screen.findByText(t.broadcastUnavailable)).not.toBeNull();
			expect(screen.queryByRole('button', { name: t.broadcastSend })).toBeNull();
		},
	);

	it('confirms before sending and clears the draft only after a successful send', async () => {
		// Arrange
		const user = userEvent.setup();
		const screen = renderDashboard(['manage:sessions'], {
			view: 'broadcast',
			status: SessionStatusEnum.REGISTRATION_OPEN,
		});
		const send = vi.spyOn(screen.store.admin, 'sendBroadcast').mockResolvedValue(false);
		const title = (await screen.findByLabelText(t.broadcastTitleLabel)) as HTMLInputElement;
		const body = screen.getByLabelText(t.broadcastMessageLabel) as HTMLTextAreaElement;

		await user.type(title, 'Doors open');
		await user.type(body, 'Come on in');
		const submit = screen.getByRole('button', { name: t.broadcastSend });

		// Act / Assert: cancellation does not send; failures keep the draft.
		await user.click(submit);
		expect((await screen.findByRole('alertdialog')).textContent).toContain(t.broadcastConfirm);
		await answerConfirmation(user, t.cancel);
		expect(send).not.toHaveBeenCalled();
		await user.click(submit);
		await answerConfirmation(user, t.broadcastSend);
		expect(send).toHaveBeenCalledWith({ title: 'Doors open', body: 'Come on in' });
		expect(title.value).toBe('Doors open');
		expect(body.value).toBe('Come on in');

		// Act / Assert: success clears both fields.
		send.mockResolvedValue(true);
		await user.click(submit);
		await answerConfirmation(user, t.broadcastSend);
		await waitFor(() => expect(title.value).toBe(''));
		expect(body.value).toBe('');
	});
});
