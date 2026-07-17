import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';

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
	it('renders the guest queue form', () => {
		const wrapper = mountApp();

		expect(wrapper.text()).toContain('Welcome to the community food market');
		expect(wrapper.text()).toContain('Number of people in your household');
	});

	it('switches the guest copy to Spanish', async () => {
		const wrapper = mountApp();

		await wrapper.find('select').setValue('es');

		expect(wrapper.text()).toContain('Bienvenido al mercado comunitario de alimentos');
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
