import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '../App.vue';

function mountApp() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'guest', component: App },
			{ path: '/admin', name: 'admin', component: App },
		],
	});

	return mount(App, { global: { plugins: [router] } });
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
				}),
				method: 'POST',
			}),
		);
		expect(wrapper.text()).toContain('You’re in the queue!');

		vi.unstubAllGlobals();
	});
});
