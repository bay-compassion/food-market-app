import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import QrCodeView from '../components/QrCodeView.vue';
import { translations } from '../locales';
import { RootStore, rootStoreKey } from '../stores/root.store';

/**
 * `/qr-code` is the poster a market prints and puts on a table, so it is the one screen nobody
 * opens while developing. It once shipped with every label undefined — it had been rendered by
 * `App.vue` with props, was promoted to a route component of its own, and the props were not
 * replaced. These tests are what would have caught that.
 */

async function mountQrCodeView() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'guest', component: { template: '<div>guest</div>' } },
			{ path: '/qr-code', name: 'qr-code', component: QrCodeView },
		],
	});

	await router.push({ name: 'qr-code' });
	await router.isReady();

	const rootStore = new RootStore();
	const wrapper = mount(QrCodeView, {
		global: { plugins: [router], provide: { [rootStoreKey as symbol]: rootStore } },
	});

	await flushPromises();

	return { wrapper, router };
}

describe('QrCodeView', () => {
	it('renders every one of its labels', async () => {
		// Arrange
		const t = translations.en;

		// Act
		const { wrapper } = await mountQrCodeView();

		// Assert
		expect(wrapper.text()).toContain(t.qrCodeTitle);
		expect(wrapper.text()).toContain(t.qrCodeDescription);
		expect(wrapper.text()).toContain(t.backToGuest);
		expect(wrapper.text()).toContain(t.qrCodePrint);
		expect(wrapper.get('.qr-code').attributes('aria-label')).toBe(t.qrCodeImageAlt);
	});

	it('renders a scannable QR code for the guest route', async () => {
		// Act
		const { wrapper } = await mountQrCodeView();

		// Assert
		expect(wrapper.get('.qr-code').html()).toContain('<svg');
		expect(wrapper.get('.qr-url').text()).toBe(`${window.location.origin}/`);
	});

	it('goes back to the guest screen', async () => {
		// Arrange
		const { wrapper, router } = await mountQrCodeView();
		const t = translations.en;
		const back = wrapper.findAll('button').find((button) => button.text() === t.backToGuest);

		// Act
		await back?.trigger('click');
		await flushPromises();

		// Assert
		expect(router.currentRoute.value.name).toBe('guest');
	});
});
