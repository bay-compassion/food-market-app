import { AUTH0_INJECTION_KEY } from '@auth0/auth0-vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '../App.vue';
import { authReturnUrl } from '../auth';
import AdminDashboard from '../components/AdminDashboard.vue';

const authClient = {
	isLoading: ref(false),
	isAuthenticated: ref(false),
	user: ref(undefined),
	error: ref(null),
	getAccessTokenSilently: vi.fn(),
	logout: vi.fn(),
};

function mountApp() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'guest', component: App },
			{ path: '/admin', name: 'admin', component: App },
		],
	});

	return mount(App, {
		global: {
			plugins: [router],
			provide: { [AUTH0_INJECTION_KEY as symbol]: authClient },
		},
	});
}

describe('App', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('renders the guest queue form', () => {
		const wrapper = mountApp();

		expect(wrapper.text()).toContain('Welcome to the community food market');
		expect(wrapper.text()).toContain('Number of people in your household');
	});

	it('uses the exact root URL Auth0 expects for redirects', () => {
		expect(authReturnUrl).toBe(`${window.location.origin}/`);
	});

	it('switches the guest copy to Spanish', async () => {
		const wrapper = mountApp();

		await wrapper.findAll('.language-option')[1]!.trigger('click');

		expect(window.localStorage.getItem('bay-compassion.locale')).toBe('es');
		expect(window.localStorage.getItem('bay-compassion.returning-visitor')).toBe('true');
		expect(wrapper.find('.hero').exists()).toBe(false);
	});

	it('uses saved settings for returning visitors', () => {
		window.localStorage.setItem('bay-compassion.locale', 'es');
		window.localStorage.setItem('bay-compassion.returning-visitor', 'true');

		const wrapper = mountApp();

		expect(wrapper.find('.hero').exists()).toBe(false);
		expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('es');
		expect(wrapper.text()).toContain('Cuéntenos sobre usted');
	});

	it('offers the requested language options on the guest page', () => {
		const wrapper = mountApp();

		expect(wrapper.findAll('.language-option')).toHaveLength(7);
		expect(wrapper.text()).toContain('فارسی');
		expect(wrapper.text()).toContain('Tagalog');
		expect(wrapper.text()).toContain('Tiếng Việt');
		expect(wrapper.text()).toContain('中文');
		expect(wrapper.text()).toContain('العربية');
	});

	it('renders Persian in a right-to-left layout', async () => {
		const wrapper = mountApp();

		await wrapper.findAll('.language-option')[2]!.trigger('click');

		expect(wrapper.attributes('dir')).toBe('rtl');
		expect(wrapper.text()).toContain('درباره خودتان بگویید');
	});

	it('sends the guest check-in to the API', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
		const wrapper = mountApp();
		const inputs = wrapper.findAll('input');

		await inputs[0]!.setValue('Ada');
		await inputs[1]!.setValue('Lovelace');
		await inputs[2]!.setValue('36');
		await inputs[3]!.setValue('2');
		await inputs[4]!.setValue('(555) 123-4567');
		await wrapper.find('form').trigger('submit');

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/guests',
			expect.objectContaining({
				body: JSON.stringify({
					firstName: 'Ada',
					lastName: 'Lovelace',
					age: 36,
					householdSize: 2,
					phone: '(555) 123-4567',
					locale: 'en',
					marketEventId: null,
					answers: {},
					source: 'self',
				}),
				method: 'POST',
			}),
		);
		expect(wrapper.text()).toContain('You’re in the queue!');

		vi.unstubAllGlobals();
	});

	it('shows an error when an admin session cannot be verified', async () => {
		const wrapper = mountApp();

		await wrapper.find('.mode-button').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('We could not verify your admin session');
	});

	it('sends an access token from the administration surfaces', async () => {
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
		const getAccessToken = vi.fn().mockResolvedValue('admin-access-token');
		const wrapper = mount(AdminDashboard, {
			props: { locale: 'en', getAccessToken },
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Current session');
		expect(wrapper.text()).toContain('Registration settings');
		expect(wrapper.text()).toContain('Schedule registration');
		expect(wrapper.text()).toContain('Registration open for (minutes)');
		expect(wrapper.text()).not.toContain('Registration closes');
		expect(wrapper.text()).not.toContain('Registration questions');

		await wrapper.find('.settings-card select').setValue('ad_hoc');
		expect(wrapper.text()).toContain('Open registration');
		expect(wrapper.text()).toContain('Registration closes');
		expect(wrapper.text()).not.toContain('Registration open for (minutes)');

		await wrapper.findAll('.admin-navigation button')[1]!.trigger('click');
		expect(wrapper.text()).toContain('Registration questions');

		await wrapper.findAll('.admin-navigation button')[2]!.trigger('click');
		expect(wrapper.text()).toContain('All guests');
		expect(wrapper.text()).toContain('Add guest');
		expect(getAccessToken).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/market',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer admin-access-token' }),
			}),
		);

		vi.unstubAllGlobals();
	});

	it.each([
		{
			status: 'scheduled',
			shown: ['Registration scheduled', 'Postpone registration', 'Open registration now'],
			hidden: ['Registration settings', 'Today’s overview'],
		},
		{
			status: 'registration_open',
			shown: ['Registration overrides', 'Extend registration by (minutes)', 'Close registration'],
			hidden: ['Today’s overview', 'Run lottery draw'],
		},
		{
			status: 'registration_closed',
			shown: ['Reopen registration', 'Run lottery draw'],
			hidden: ['Registration settings', 'Today’s overview'],
		},
		{
			status: 'service_started',
			shown: ['Today’s overview', 'Add guest', 'Close session'],
			hidden: ['Registration settings', 'Run lottery draw'],
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
			const wrapper = mount(AdminDashboard, {
				props: { locale: 'en', getAccessToken: vi.fn().mockResolvedValue('token') },
			});
			await flushPromises();

			for (const copy of shown) {
				expect(wrapper.text()).toContain(copy);
			}
			for (const copy of hidden) {
				expect(wrapper.text()).not.toContain(copy);
			}

			vi.unstubAllGlobals();
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
		const wrapper = mount(AdminDashboard, {
			props: { locale: 'en', getAccessToken: vi.fn().mockResolvedValue('token') },
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Registered guests');
		expect(wrapper.text()).toContain('Ada Lovelace');
		expect(wrapper.text()).not.toContain('Grace Hopper');

		vi.unstubAllGlobals();
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
		const wrapper = mount(AdminDashboard, {
			props: { locale: 'en', getAccessToken: vi.fn().mockResolvedValue('token') },
		});
		await flushPromises();

		const opensAt = '2026-07-18T09:00';
		await wrapper.find('input[type="datetime-local"]').setValue(opensAt);
		await wrapper.find('input[list="registration-duration-options"]').setValue('45');
		await wrapper.find('.settings-card form').trigger('submit');
		await flushPromises();

		const settingsRequest = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
		const body = JSON.parse(String(settingsRequest?.[1]?.body));
		expect(body.sessionMode).toBe('scheduled');
		expect(body.registrationClosesAt).toBe(
			new Date(new Date(opensAt).valueOf() + 45 * 60_000).toISOString(),
		);

		vi.unstubAllGlobals();
	});

	it('confirms a transition before sending it to the protected market endpoint', async () => {
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
		const wrapper = mount(AdminDashboard, {
			props: { locale: 'en', getAccessToken: vi.fn().mockResolvedValue('token') },
		});
		await flushPromises();

		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Close registration')!
			.trigger('click');
		await flushPromises();

		expect(confirmMock).toHaveBeenCalledWith('Close registration now?');
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/market',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ action: 'close_registration' }),
				headers: expect.objectContaining({ Authorization: 'Bearer token' }),
			}),
		);

		confirmMock.mockClear();
		fetchMock.mockClear();
		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Reset session')!
			.trigger('click');
		await flushPromises();

		expect(confirmMock).toHaveBeenCalledWith(
			'Reset this session? It will leave Current Session and remain available in session history.',
		);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/market',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ action: 'reset_session' }),
			}),
		);

		confirmMock.mockRestore();
		vi.unstubAllGlobals();
	});
});
