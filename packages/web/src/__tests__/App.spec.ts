import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import App from '../App.vue';

describe('App', () => {
	it('renders the guest queue form', () => {
		const wrapper = mount(App);

		expect(wrapper.text()).toContain('Welcome to the community food market');
		expect(wrapper.text()).toContain('Number of people in your household');
	});

	it('switches the guest copy to Spanish', async () => {
		const wrapper = mount(App);

		await wrapper.find('select').setValue('es');

		expect(wrapper.text()).toContain('Bienvenido al mercado comunitario de alimentos');
	});
});
