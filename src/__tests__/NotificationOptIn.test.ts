import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NotificationOptIn from '../components/NotificationOptIn.vue';

function mountOptIn(visitToken: string | null = 'token-1') {
	return mount(NotificationOptIn, { props: { visitToken, locale: 'en' } });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('NotificationOptIn', () => {
	it('renders neither section when push and SMS are both unconfigured', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ configured: false }) }),
		);
		const wrapper = mountOptIn();
		await flushPromises();

		expect(wrapper.text()).toBe('');
	});

	it('shows the unsupported message when push is configured but the browser lacks push APIs', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string) =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve(
							url === '/api/push-subscription'
								? { configured: true, publicKey: 'public-key' }
								: { configured: false },
						),
				}),
			),
		);
		const wrapper = mountOptIn();
		await flushPromises();

		expect(wrapper.text()).toContain('Push notifications are not available on this device.');
	});

	it('lets a guest consent to SMS updates and shows the enabled state', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
			if (url === '/api/sms-subscription' && options?.method === 'POST') {
				expect(options.headers).toMatchObject({ Authorization: 'Bearer token-1' });
				expect(JSON.parse(options.body as string)).toEqual({ consent: true });

				return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscribed: true }) });
			}

			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url === '/api/sms-subscription' ? { configured: true } : { configured: false },
					),
			});
		});
		vi.stubGlobal('fetch', fetchMock);
		const wrapper = mountOptIn();
		await flushPromises();

		expect(wrapper.text()).toContain('text messages from The Bay Compassion');
		expect(wrapper.text()).toContain('Message frequency varies');
		expect(wrapper.text()).toContain('Message and data rates may apply');
		expect(wrapper.text()).toContain('Reply STOP to unsubscribe or HELP for assistance');
		expect(wrapper.get('a[href="/privacy"]').text()).toBe('Privacy Policy');
		expect(wrapper.get('a[href="/terms"]').text()).toBe('Terms & Conditions');
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();

		await wrapper.find('input[type="checkbox"]').setValue(true);
		expect(wrapper.find('button').attributes('disabled')).toBeUndefined();

		await wrapper.find('button').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('Text message updates are enabled for this visit.');
	});

	it('shows an error when enabling SMS fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation((url: string, options?: RequestInit) =>
				Promise.resolve(
					url === '/api/sms-subscription' && options?.method === 'POST'
						? { ok: false, json: () => Promise.resolve({}) }
						: {
								ok: true,
								json: () =>
									Promise.resolve(
										url === '/api/sms-subscription' ? { configured: true } : { configured: false },
									),
							},
				),
			),
		);
		const wrapper = mountOptIn();
		await flushPromises();

		await wrapper.find('input[type="checkbox"]').setValue(true);
		await wrapper.find('button').trigger('click');
		await flushPromises();

		expect(wrapper.text()).toContain('We could not enable text updates. Please try again.');
	});
});
