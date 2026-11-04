import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The real module only configures Auth0 when the VITE_AUTH0_* variables are set, which is true on
// some machines and not others. Pin it on so these tests always take the read-the-token path.
vi.mock('../auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../auth')>()),
	auth0Settings: null,
	isAuth0Configured: true,
}));

import { adminTranslations } from '../adminLocales';
import { adminViewLabels } from '../components/admin/admin-view-labels';
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
		<MemoryRouter>
			<RootStoreProvider store={store}>
				<AdminDashboard
					view={view}
					getAccessToken={() => Promise.resolve(tokenWith(permissions))}
					onNavigate={onNavigate}
				/>
				<ConfirmationDrawer />
			</RootStoreProvider>
		</MemoryRouter>,
	);

	return { ...result, onNavigate, store };
}

/** Every screen the phone offers: the tabs, and what is behind More when there is one. */
async function navigationLabels() {
	const tabs = await waitFor(() => {
		const bar = document.body.querySelector<HTMLElement>('.admin-tabs');

		if (!bar) {
			throw new Error('The tab bar has not rendered yet.');
		}

		return bar;
	});
	const more = tabs.querySelector<HTMLButtonElement>('.admin-more-tab');
	const onTabs = Array.from(tabs.querySelectorAll<HTMLButtonElement>('button[data-view]')).map(
		(button) => adminViewLabels[button.dataset.view as AdminView],
	);

	if (!more) {
		return onTabs;
	}

	await userEvent.setup().click(more);

	const inSheet = Array.from(
		document.body.querySelectorAll<HTMLButtonElement>('.admin-navigation button'),
	).map((button) => button.textContent);

	await userEvent.setup().keyboard('{Escape}');

	return [...onTabs, ...inSheet];
}

async function navigateTo(label: string) {
	const user = userEvent.setup();
	const tabs = await waitFor(() => {
		const bar = document.body.querySelector<HTMLElement>('.admin-tabs');

		if (!bar) {
			throw new Error('The tab bar has not rendered yet.');
		}

		return bar;
	});
	const tab = Array.from(tabs.querySelectorAll<HTMLButtonElement>('button[data-view]')).find(
		(button) => adminViewLabels[button.dataset.view as AdminView] === label,
	);

	if (tab) {
		await user.click(tab);

		return;
	}

	await user.click(tabs.querySelector<HTMLButtonElement>('.admin-more-tab')!);
	await user.click(
		within(document.body.querySelector<HTMLElement>('.admin-navigation')!).getByRole('button', {
			name: label,
		}),
	);
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('admin navigation by permission', () => {
	it('offers a queue worker only the screens their role can open', async () => {
		renderDashboard(['run:queue']);

		expect(await navigationLabels()).toEqual([t.currentSession, t.queue, t.historySessions]);
	});

	it('offers an administrator everything', async () => {
		renderDashboard(['run:queue', 'manage:sessions', 'read:reports', 'export:guest-data']);

		expect(await navigationLabels()).toEqual([
			t.currentSession,
			t.queue,
			t.guestDatabase,
			t.checklist.title,
			t.broadcastTitle,
			t.schedule,
			t.questionBank,
			t.historySessions,
			t.reports,
		]);
	});

	it('lands someone on a screen they can open, not the default one they cannot', async () => {
		// Arrange and act
		const { onNavigate } = renderDashboard(['read:reports']);

		// Assert: Today needs run:queue.
		await waitFor(() => expect(onNavigate.mock.calls[0]).toEqual(['reports']));
	});

	it('lands a worker on the queue during service', async () => {
		// Arrange and act
		const { onNavigate } = renderDashboard(['run:queue'], {
			status: SessionStatusEnum.SERVICE_STARTED,
		});

		// Assert
		await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('queue'));
	});

	it('lands a worker on Today before service', async () => {
		// Arrange and act
		const { getByRole, onNavigate } = renderDashboard(['run:queue'], {
			status: SessionStatusEnum.REGISTRATION_OPEN,
		});

		// Assert
		await waitFor(() => expect(getByRole('timer')).toBeTruthy());
		expect(getByRole('heading', { level: 1 }).textContent).toBe(t.currentSession);
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it('keeps a worker on the screen the route names, even during service', async () => {
		// Arrange and act
		const { findByRole, onNavigate } = renderDashboard(['run:queue'], {
			status: SessionStatusEnum.SERVICE_STARTED,
			view: 'current-session',
		});

		// Assert
		await findByRole('button', { name: t.closeSession });
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it('lands someone who steers the session on Today during service', async () => {
		// Arrange and act
		const { findByRole, onNavigate } = renderDashboard(['run:queue', 'manage:sessions'], {
			status: SessionStatusEnum.SERVICE_STARTED,
		});

		// Assert
		await findByRole('button', { name: t.today.sendBroadcast });
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it('explains itself to someone signed in with no role at all', async () => {
		const { container } = renderDashboard([]);

		await waitFor(() => expect(container.textContent).toContain(t.noAccess));
		expect(document.body.querySelector('.admin-tabs')).toBeNull();
		expect(document.body.querySelector('.admin-navigation')).toBeNull();
	});

	it('does not request guest data a worker has no permission to read', async () => {
		renderDashboard(['read:reports']);

		expect(await navigationLabels()).toEqual([t.reports]);

		const urls = vi
			.mocked(fetch)
			.mock.calls.map(([input]) => (input instanceof Request ? input.url : input.toString()));

		expect(urls.some((url) => url.startsWith('/api/admin/guests'))).toBe(false);
	});

	// manage:demo-data is deliberately not part of `worker` or `admin` — see docs/roles.md — so an
	// administrator holding the other four permissions should not see it either.
	it('offers the dev-mode screen only to whoever holds manage:demo-data', async () => {
		renderDashboard(['manage:demo-data']);

		expect(await navigationLabels()).toEqual([t.devMode]);
	});
});

describe('broadcast notification screen', () => {
	it('opens its own screen and preserves a draft across screen switches', async () => {
		// Arrange
		const user = userEvent.setup();
		const screen = renderDashboard(['run:queue', 'manage:sessions'], {
			status: SessionStatusEnum.REGISTRATION_OPEN,
		});

		expect(screen.queryByLabelText(t.broadcastTitleLabel)).toBeNull();

		// Act
		await navigateTo(t.broadcastTitle);
		await user.type(screen.getByLabelText(t.broadcastTitleLabel), 'Doors open');
		await user.type(screen.getByLabelText(t.broadcastMessageLabel), 'Come on in');
		await navigateTo(t.currentSession);
		expect(screen.queryByLabelText(t.broadcastTitleLabel)).toBeNull();
		await navigateTo(t.broadcastTitle);

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
