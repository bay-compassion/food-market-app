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
						url.startsWith('/api/guests') ? [] : { event: null, questions: [], counts: {} },
					),
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
		const getAccessToken = vi.fn().mockResolvedValue('admin-access-token');
		const wrapper = mount(AdminDashboard, {
			props: { locale: 'en', getAccessToken },
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Market dashboard');
		expect(wrapper.text()).toContain('Registration settings');
		expect(wrapper.text()).toContain('Registration questions');
		expect(wrapper.text()).toContain('Guest list');
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
});
