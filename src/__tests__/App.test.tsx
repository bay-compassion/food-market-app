import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real module only configures Auth0 when the VITE_AUTH0_* variables are set, which is true
// locally but not in CI. Pretend it is configured so the admin surfaces use the client below.
vi.mock('../auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../auth')>()),
	auth0Settings: null,
	isAuth0Configured: true,
}));

// `useAuth0` stands in for the provider the real app mounts, so a test can put the admin surfaces
// into any auth state without an Auth0 tenant.
const authClient = {
	isLoading: false,
	isAuthenticated: false,
	user: undefined as { email?: string; name?: string } | undefined,
	error: undefined as Error | undefined,
	getAccessTokenSilently: vi.fn(),
	loginWithRedirect: vi.fn(),
	logout: vi.fn(),
};

vi.mock('@auth0/auth0-react', () => ({
	useAuth0: () => authClient,
	Auth0Provider: ({ children }: { children: React.ReactNode }) => children,
}));

import { createMemoryRouter, RouterProvider } from 'react-router';

import { App } from '../App';
import { authReturnUrl } from '../auth';
import { AdminAuthView } from '../components/AdminAuthView';
import { AdminDashboard } from '../components/AdminDashboard';
import { GuestView } from '../components/guest-view/GuestView';
import { PrivacyPage } from '../components/legal/PrivacyPage';
import { TermsPage } from '../components/legal/TermsPage';
import { SignupView } from '../components/routes/SignupView';
import { translations } from '../locales';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

/**
 * An unsigned access token carrying permissions, which is all the admin screens read it for.
 * Nothing verifies it here — the server does that, against Auth0's keys.
 */
function accessTokenWith(permissions: string[]) {
	const segment = (value: unknown) =>
		btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	return `${segment({ alg: 'none', typ: 'JWT' })}.${segment({ permissions })}.`;
}

const adminToken = accessTokenWith([
	'run:queue',
	'manage:sessions',
	'read:reports',
	'export:guest-data',
]);

function renderApp(initialPath = '/') {
	const router = createMemoryRouter(
		[
			{
				element: <App />,
				children: [
					{ path: '/', element: <GuestView /> },
					{ path: '/privacy', element: <PrivacyPage /> },
					{ path: '/terms', element: <TermsPage /> },
					{ path: '/signup', element: <SignupView /> },
					{ path: '/admin/:view?', element: <AdminAuthView /> },
				],
			},
		],
		{ initialEntries: [initialPath] },
	);

	return render(
		<RootStoreProvider store={new RootStore()}>
			<RouterProvider router={router} />
		</RootStoreProvider>,
	);
}

function renderDashboard(getAccessToken = vi.fn().mockResolvedValue(adminToken)) {
	const result = render(
		<RootStoreProvider store={new RootStore()}>
			<AdminDashboard getAccessToken={getAccessToken} onNavigate={vi.fn()} />
		</RootStoreProvider>,
	);

	return { ...result, getAccessToken };
}

/** The market fixture every guest-side test builds on. */
function marketEvent(status: string) {
	return {
		id: 'event-1',
		status,
		registrationOpensAt: '2020-01-01T00:00:00.000Z',
		registrationClosesAt:
			status === 'registration_open' ? '2099-01-01T00:00:00.000Z' : '2020-01-01T01:00:00.000Z',
	};
}

describe('App', () => {
	beforeEach(() => {
		window.localStorage.clear();
		authClient.isLoading = false;
		authClient.isAuthenticated = false;
		authClient.user = undefined;
		authClient.error = undefined;
		vi.unstubAllGlobals();
	});

	// Restored here rather than at the end of the tests that install them: a failing assertion
	// would otherwise leave fake timers in place and every later test would hang on `waitFor`.
	afterEach(() => {
		vi.useRealTimers();
	});

	function renderWithMarketStatus(status: string) {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string) =>
				Promise.resolve(
					url === '/api/market'
						? {
								ok: true,
								json: () => Promise.resolve({ event: marketEvent(status), questions: [] }),
							}
						: { ok: false },
				),
			),
		);

		return renderApp();
	}

	it('renders the guest queue form', async () => {
		const { container } = renderWithMarketStatus('registration_open');

		await waitFor(() =>
			expect(container.textContent).toContain('Number of people in your household'),
		);
		expect(container.textContent).toContain('Welcome to the community food market');
	});

	it('uses the exact root URL Auth0 expects for redirects', () => {
		expect(authReturnUrl).toBe(`${window.location.origin}/`);
	});

	it('switches the guest copy to Spanish', async () => {
		const user = userEvent.setup();
		const { container } = renderWithMarketStatus('registration_open');

		await waitFor(() => expect(container.querySelectorAll('.language-option')).toHaveLength(7));

		await user.click(container.querySelectorAll('.language-option')[1]!);

		expect(window.localStorage.getItem('bay-compassion.locale')).toBe('es');
		expect(window.localStorage.getItem('bay-compassion.returning-visitor')).toBe('true');
		expect(container.querySelector('.hero')).toBeNull();
	});

	it('uses saved settings for returning visitors', async () => {
		window.localStorage.setItem('bay-compassion.locale', 'es');
		window.localStorage.setItem('bay-compassion.returning-visitor', 'true');

		const { container } = renderWithMarketStatus('registration_open');

		await waitFor(() => expect(container.textContent).toContain('Cuéntenos sobre usted'));

		expect(container.querySelector('.hero')).toBeNull();
		expect(container.querySelector<HTMLSelectElement>('select')!.value).toBe('es');
	});

	it('offers the requested language options on the guest page', async () => {
		const { container } = renderWithMarketStatus('registration_open');

		await waitFor(() => expect(container.querySelectorAll('.language-option')).toHaveLength(7));

		expect(container.textContent).toContain('فارسی');
		expect(container.textContent).toContain('Tagalog');
		expect(container.textContent).toContain('Tiếng Việt');
		expect(container.textContent).toContain('中文');
		expect(container.textContent).toContain('العربية');
	});

	it('renders Persian in a right-to-left layout', async () => {
		const user = userEvent.setup();
		const { container } = renderWithMarketStatus('registration_open');

		await waitFor(() => expect(container.querySelectorAll('.language-option')).toHaveLength(7));

		await user.click(container.querySelectorAll('.language-option')[2]!);

		expect(container.querySelector('.app-shell')!.getAttribute('dir')).toBe('rtl');
		expect(container.textContent).toContain('درباره خودتان بگویید');
	});

	/** Fills every field of the combined registration form, in the order a guest meets them. */
	async function fillRegistration(container: HTMLElement) {
		const user = userEvent.setup();

		// Not yet identified, so the sign-up fields (name, phone) and the lottery-entry fields
		// (age range, household composition) both render, in one combined form. Selected by
		// attribute rather than position — `GuestSignupForm` and `GuestLotteryForm` order their
		// fields differently than the single form they replaced.
		await user.type(container.querySelector('input[autocomplete="given-name"]')!, 'Ada');
		await user.type(container.querySelector('input[autocomplete="family-name"]')!, 'Lovelace');
		await user.type(container.querySelector('input[type="tel"]')!, '5551234567');
		await user.selectOptions(container.querySelector('select')!, '18-29');

		// Household, children, then seniors — `GuestLotteryForm`'s stable relative order.
		const countInputs = container.querySelectorAll<HTMLInputElement>('input.count-other');

		await user.type(countInputs[0]!, '2');
		await user.type(countInputs[1]!, '1');
		await user.type(countInputs[2]!, '0');

		fireEvent.submit(container.querySelector('form')!);
	}

	it('sends the guest check-in to the API', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string) =>
			Promise.resolve(
				url === '/api/market'
					? {
							ok: true,
							json: () =>
								Promise.resolve({ event: marketEvent('registration_open'), questions: [] }),
						}
					: {
							ok: true,
							json: () =>
								Promise.resolve({
									id: 'visit-1',
									status: 'registered',
									visitToken: 'token-1',
									deviceToken: 'server-issued-device-token',
								}),
						},
			),
		);

		vi.stubGlobal('fetch', fetchMock);
		const { container } = renderApp();

		await waitFor(() => expect(container.querySelector('input.count-other')).not.toBeNull());
		await fillRegistration(container);

		await waitFor(() => expect(container.textContent).toContain('You’re in the queue!'));

		const registrationCall = fetchMock.mock.calls.find(([url]) => url === '/api/guests');
		const body = JSON.parse(registrationCall?.[1]?.body as string) as Record<string, unknown>;

		expect(body).toMatchObject({
			firstName: 'Ada',
			lastName: 'Lovelace',
			ageRange: '18-29',
			householdSize: 2,
			childrenCount: 1,
			seniorsCount: 0,
			phone: '(555) 123-4567',
			locale: 'en',
			marketEventId: 'event-1',
			answers: {},
			source: 'self',
		});
		expect(body.deviceToken).toBeNull();
		expect(registrationCall?.[1]?.method).toBe('POST');
		expect(window.localStorage.getItem('bay-compassion.visit-token')).toBe('token-1');
		expect(window.localStorage.getItem('bay-compassion.guest-device-token')).toBe(
			JSON.stringify('server-issued-device-token'),
		);
		expect(JSON.parse(window.localStorage.getItem('bay-compassion.guest-identity') ?? '')).toEqual({
			firstName: 'Ada',
			lastName: 'Lovelace',
			phone: '(555) 123-4567',
		});
		expect(container.querySelector('.guest-identity')!.textContent).toContain('Ada L');
		expect(container.querySelector('.guest-identity')!.textContent).toContain('(555) 123-4567');
		expect(container.querySelector('.guest-layout')!.firstElementChild).toBe(
			container.querySelector('.guest-identity'),
		);
	});

	it('reuses a saved device credential while collecting renewed guest information', async () => {
		window.localStorage.setItem(
			'bay-compassion.guest-device-token',
			JSON.stringify('saved-device-token'),
		);

		const fetchMock = vi.fn().mockImplementation((url: string) =>
			Promise.resolve(
				url === '/api/market'
					? {
							ok: true,
							json: () =>
								Promise.resolve({ event: marketEvent('registration_open'), questions: [] }),
						}
					: {
							ok: true,
							json: () =>
								Promise.resolve({ id: 'visit-2', status: 'registered', visitToken: 'token-2' }),
						},
			),
		);

		vi.stubGlobal('fetch', fetchMock);
		const { container } = renderApp();

		// A device token with no locally cached identity (this test sets only the token, not
		// `bay-compassion.guest-identity`) still shows the sign-up fields — there's nothing to
		// prefill them with. See `GuestRegistrationForm`'s `showSignupFields`.
		await waitFor(() => expect(container.querySelector('input.count-other')).not.toBeNull());
		await fillRegistration(container);

		await waitFor(() => expect(container.textContent).toContain('Current status: Registered'));

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/guests',
			expect.objectContaining({
				body: expect.stringContaining('"deviceToken":"saved-device-token"'),
			}),
		);
	});

	it('clears an expired visit from a previous session', async () => {
		window.localStorage.setItem('bay-compassion.visit-token', 'expired-token');

		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string) =>
				Promise.resolve(
					url === '/api/market'
						? {
								ok: true,
								json: () =>
									Promise.resolve({
										event: { ...marketEvent('registration_open'), id: 'event-2' },
										questions: [],
									}),
							}
						: url === '/api/visit'
							? { ok: false, status: 410 }
							: { ok: false },
				),
			),
		);

		const { container } = renderApp();

		await waitFor(() => expect(container.querySelector('form')).not.toBeNull());

		expect(window.localStorage.getItem('bay-compassion.visit-token')).toBeNull();
		expect(container.textContent).not.toContain('You’re in the queue!');
	});

	it('shows identity signup on /signup when the device token is missing', async () => {
		window.localStorage.setItem('bay-compassion.visit-token', 'visit-token');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string) =>
				Promise.resolve(
					url === '/api/visit'
						? {
								ok: true,
								json: () =>
									Promise.resolve({
										id: 'visit-1',
										status: 'waiting',
										queuePosition: 2,
										aheadOfYou: 1,
									}),
							}
						: {
								ok: true,
								json: () =>
									Promise.resolve({ event: marketEvent('service_started'), questions: [] }),
							},
				),
			),
		);

		const { container } = renderApp('/signup');

		await waitFor(() =>
			expect(container.querySelector('input[autocomplete="given-name"]')).not.toBeNull(),
		);

		expect(container.querySelector('input[autocomplete="family-name"]')).not.toBeNull();
		expect(container.querySelector('input[type="tel"]')).not.toBeNull();
		expect(container.querySelector('input.count-other')).toBeNull();
		expect(container.textContent).not.toContain('Your place in line');
	});

	function renderWithVisit(visit: Record<string, unknown>) {
		window.localStorage.setItem('bay-compassion.visit-token', 'visit-token');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string) =>
				Promise.resolve(
					url === '/api/visit'
						? { ok: true, json: () => Promise.resolve(visit) }
						: {
								ok: true,
								json: () =>
									Promise.resolve({ event: marketEvent('service_started'), questions: [] }),
							},
				),
			),
		);

		return renderApp();
	}

	it('shows a waiting guest their place in line and how many are ahead', async () => {
		const { container } = renderWithVisit({
			id: 'visit-1',
			status: 'waiting',
			queuePosition: 7,
			aheadOfYou: 3,
		});

		await waitFor(() => expect(container.textContent).toContain('Your place in line'));

		expect(container.textContent).toContain('7');
		expect(container.textContent).toContain('Guests ahead of you');
	});

	it('tells a waiting guest when nobody is ahead of them', async () => {
		const { container } = renderWithVisit({
			id: 'visit-1',
			status: 'waiting',
			queuePosition: 1,
			aheadOfYou: 0,
		});

		await waitFor(() => expect(container.textContent).toContain('You are next'));

		expect(container.textContent).not.toContain('Guests ahead of you');
	});

	it('replaces the waiting copy with a call to the table once the guest is called', async () => {
		const { container } = renderWithVisit({
			id: 'visit-1',
			status: 'called',
			queuePosition: 2,
			aheadOfYou: null,
		});

		await waitFor(() => expect(container.textContent).toContain('It’s your turn'));

		expect(container.textContent).toContain('Please come to the table now.');
		expect(container.textContent).not.toContain('Your place in line');
		// A called guest has nothing left to cancel.
		expect(container.textContent).not.toContain('Cancel this visit');
	});

	it('keeps refreshing after a guest has been called', async () => {
		// Fake timers are installed before rendering: the poll interval is created during the
		// initial load, and switching clocks afterwards would leave that interval on the real one.
		vi.useFakeTimers();
		renderWithVisit({ id: 'visit-1', status: 'called', queuePosition: 2, aheadOfYou: null });

		await vi.runOnlyPendingTimersAsync();

		const callsAfterLoad = vi
			.mocked(fetch)
			.mock.calls.filter(([url]) => url === '/api/visit').length;

		await vi.advanceTimersByTimeAsync(15_000);

		const callsAfterWait = vi
			.mocked(fetch)
			.mock.calls.filter(([url]) => url === '/api/visit').length;

		expect(callsAfterWait).toBeGreaterThan(callsAfterLoad);
	});

	it('hides the inactive-market explanation while registration is open', async () => {
		const { container } = renderWithMarketStatus('registration_open');

		await screen.findByRole('heading', { name: translations.en.formTitle });

		expect(container.textContent).not.toContain(translations.en.guestView.notOpenState.heading);
	});

	it('hides the inactive-market explanation while the event is in progress', async () => {
		const { container } = renderWithMarketStatus('service_started');

		await screen.findByRole('heading', {
			name: translations.en.guestView.serviceState.inProgressHeading,
		});

		expect(container.textContent).not.toContain(translations.en.guestView.notOpenState.heading);
	});

	it('keeps the inactive-market explanation out of an active closed-registration session', async () => {
		const { container } = renderWithMarketStatus('registration_closed');

		await screen.findByRole('heading', {
			name: translations.en.guestView.registrationClosedState.heading,
		});

		expect(container.textContent).not.toContain(translations.en.guestView.notOpenState.heading);
	});

	it('shows the full inactive-market explanation when the session is inactive', async () => {
		renderWithMarketStatus('ended');
		const copy = translations.en.guestView.notOpenState;

		const heading = await screen.findByRole('heading', { name: copy.heading });
		const inactiveState = within(heading.parentElement!);

		expect(inactiveState.getByText(copy.subheading)).not.toBeNull();
		expect(inactiveState.getByText(copy.lotteryDescription)).not.toBeNull();
		expect(inactiveState.getByText(copy.selectionDescription)).not.toBeNull();
		expect(inactiveState.queryByRole('link')).toBeNull();
		// An ended session has nothing left to preregister for, so the button goes with it.
		expect(inactiveState.queryByRole('button')).toBeNull();
	});

	it('shows an error when an admin session cannot be verified', async () => {
		const user = userEvent.setup();
		const { container } = renderWithMarketStatus('registration_open');

		await user.click(container.querySelector('.mode-button')!);

		await waitFor(() =>
			expect(container.textContent).toContain('We could not verify your admin session'),
		);
	});

	it('sends an access token from the administration surfaces', async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockImplementation((url: string) =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url.startsWith('/api/guests') || url.includes('view=history')
							? []
							: { event: null, questions: [], counts: {} },
					),
			}),
		);

		vi.stubGlobal('fetch', fetchMock);
		const { container, getAccessToken } = renderDashboard();

		await waitFor(() => expect(container.textContent).toContain('Registration settings'));

		expect(container.textContent).toContain('Current session');
		expect(container.textContent).toContain('Schedule registration');
		expect(container.textContent).toContain('Registration open for (minutes)');
		expect(container.textContent).not.toContain('Registration closes');
		expect(container.textContent).not.toContain('Registration questions');

		await user.selectOptions(container.querySelector('.settings-card select')!, 'ad_hoc');
		expect(container.textContent).toContain('Open registration');
		expect(container.textContent).toContain('Registration closes');
		expect(container.textContent).not.toContain('Registration open for (minutes)');

		// Selected by label rather than index — the nav gained a Queue tab, and positional
		// indexing silently points at a different view every time the nav changes.
		const navigateTo = (label: string) =>
			user.click(
				Array.from(container.querySelectorAll('.admin-navigation button')).find(
					(button) => button.textContent === label,
				)!,
			);

		await navigateTo('Question bank');
		expect(container.textContent).toContain('Registration questions');

		await navigateTo('Guest database');
		expect(container.textContent).toContain('All guests');
		// This fixture has no session configured, so there is nothing to add a guest to.
		expect(container.textContent).not.toContain('Add guest');
		expect(getAccessToken).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/market',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: `Bearer ${adminToken}` }),
			}),
		);
	});

	it.each([
		{
			status: 'scheduled',
			shown: [
				'Registration scheduled',
				'Postpone registration',
				'Open registration now',
				'Add guest',
			],
			hidden: ['Registration settings', 'Today’s overview', 'Broadcast notification'],
		},
		{
			status: 'registration_open',
			shown: [
				'Registration overrides',
				'Extend registration by (minutes)',
				'Close registration',
				'Broadcast notification',
				'Add guest',
			],
			hidden: ['Today’s overview', 'Run lottery draw'],
		},
		{
			status: 'registration_closed',
			shown: ['Reopen registration', 'Run lottery draw', 'Broadcast notification', 'Add guest'],
			hidden: ['Registration settings', 'Today’s overview'],
		},
		{
			// Queue management moved to its own view, so current-session only points at it.
			status: 'service_started',
			shown: ['Today’s overview', 'Manage the queue', 'Broadcast notification', 'Add guest'],
			hidden: ['Registration settings', 'Run lottery draw', 'Call next'],
		},
	] as const)(
		'shows only the $status current-session controls',
		async ({ status, shown, hidden }) => {
			const currentEvent = {
				id: 'event-1',
				status,
				registrationOpensAt: '2026-07-18T16:00:00.000Z',
				registrationClosesAt: '2026-07-18T18:00:00.000Z',
				capacity: 50,
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockImplementation((url: string) =>
					Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve(
								url.startsWith('/api/guests') || url.includes('view=history')
									? []
									: { event: currentEvent, questions: [], counts: {} },
							),
					}),
				),
			);

			const { container } = renderDashboard();

			await waitFor(() => expect(container.textContent).toContain(shown[0]!));

			for (const copy of shown) {
				expect(container.textContent).toContain(copy);
			}

			for (const copy of hidden) {
				expect(container.textContent).not.toContain(copy);
			}
		},
	);

	it('lists the registered guests for the current registration session', async () => {
		const currentEvent = {
			id: 'event-1',
			status: 'registration_open',
			sessionMode: 'ad_hoc',
			registrationOpensAt: '2026-07-18T16:00:00.000Z',
			registrationClosesAt: '2026-07-18T18:00:00.000Z',
			capacity: 50,
		};

		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string) => {
				let data: unknown = { event: currentEvent, questions: [], counts: { registered: 1 } };

				if (url.includes('view=history') || url.includes('scope=all')) {
					data = [];
				} else if (url.includes('marketEventId=event-1')) {
					data = [
						{
							id: 'guest-1',
							marketEventId: 'event-1',
							firstName: 'Ada',
							lastName: 'Lovelace',
							phone: '555-0100',
							householdSize: 2,
							status: 'registered',
						},
						{
							id: 'guest-2',
							marketEventId: 'event-1',
							firstName: 'Grace',
							lastName: 'Hopper',
							phone: '555-0101',
							householdSize: 1,
							status: 'waiting',
						},
					];
				}

				return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
			}),
		);

		const { container } = renderDashboard();

		await waitFor(() => expect(container.textContent).toContain('Ada Lovelace'));

		expect(container.textContent).toContain('Registered guests');
		expect(container.textContent).not.toContain('Grace Hopper');
	});

	it('converts the registration duration to an exact closing timestamp', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string) =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url.startsWith('/api/guests') || url.includes('view=history')
							? []
							: { event: null, questions: [], counts: {} },
					),
			}),
		);

		vi.stubGlobal('fetch', fetchMock);
		const { container } = renderDashboard();

		await waitFor(() => expect(container.querySelector('.settings-card form')).not.toBeNull());

		const opensAt = '2026-07-18T09:00';

		fireEvent.change(container.querySelector('input[type="datetime-local"]')!, {
			target: { value: opensAt },
		});
		fireEvent.change(container.querySelector('input[list="registration-duration-options"]')!, {
			target: { value: '45' },
		});
		fireEvent.submit(container.querySelector('.settings-card form')!);

		await waitFor(() =>
			expect(fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT')).toBeDefined(),
		);

		const settingsRequest = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
		const body = JSON.parse(String(settingsRequest?.[1]?.body));

		expect(body.sessionMode).toBe('scheduled');
		expect(body.registrationClosesAt).toBe(
			new Date(new Date(opensAt).valueOf() + 45 * 60_000).toISOString(),
		);
	});

	it('confirms a transition before sending it to the protected market endpoint', async () => {
		const user = userEvent.setup();
		const currentEvent = {
			id: 'event-1',
			status: 'registration_open',
			registrationOpensAt: '2026-07-18T16:00:00.000Z',
			registrationClosesAt: '2026-07-18T18:00:00.000Z',
			capacity: 50,
		};
		const fetchMock = vi.fn().mockImplementation((url: string) =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url.startsWith('/api/guests') || url.includes('view=history')
							? []
							: { event: currentEvent, questions: [], counts: {} },
					),
			}),
		);
		const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);

		vi.stubGlobal('fetch', fetchMock);
		const { container } = renderDashboard();

		await waitFor(() => expect(container.textContent).toContain('Close registration'));

		await user.click(screen.getByRole('button', { name: 'Close registration' }));

		await waitFor(() => expect(confirmMock).toHaveBeenCalledWith('Close registration now?'));

		const closeRequest = fetchMock.mock.calls.find(
			([url, options]) =>
				url === '/api/market' && options?.body === JSON.stringify({ action: 'close_registration' }),
		);

		expect(closeRequest?.[1]?.method).toBe('POST');
		expect(new Headers(closeRequest?.[1]?.headers).get('Authorization')).toBe(
			`Bearer ${adminToken}`,
		);

		confirmMock.mockClear();
		fetchMock.mockClear();
		await user.click(screen.getByRole('button', { name: 'Reset session' }));

		await waitFor(() =>
			expect(confirmMock).toHaveBeenCalledWith(
				'Reset this session? It will leave Current Session and remain available in session history.',
			),
		);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/market',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ action: 'reset_session' }),
			}),
		);

		confirmMock.mockRestore();
	});
});
