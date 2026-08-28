import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import NotificationOptIn from '../components/guest-view/NotificationOptIn.vue';
import { StorageKey } from '../services/storage.service';
import { GuestStore } from '../stores/guest.store';

function mountOptIn() {
	const guest = new GuestStore({
		request: (input, init) => fetch(input, init),
		storage: {
			get: (key) =>
				key === StorageKey.GUEST_DEVICE_TOKEN ? 'test-device-token'.padEnd(32, 'x') : null,
			set: vi.fn(),
		},
	});

	return mount(NotificationOptIn, { props: { guest, locale: 'en' } });
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

	it('does not surface push notifications when push is configured', async () => {
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

		expect(wrapper.text()).toBe('');
	});

	it('lets a guest consent to SMS updates and shows the enabled state', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
			if (url === '/api/sms-subscription' && options?.method === 'POST') {
				expect(options.headers).toMatchObject({
					Authorization: `Bearer ${'test-device-token'.padEnd(32, 'x')}`,
				});
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

		expect(wrapper.text()).toContain(
			'Text message updates are enabled for this and future visits.',
		);
	});

	it('skips the checkbox for a guest already subscribed from a past visit', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
			if (url === '/api/notification-status') {
				expect(options?.headers).toMatchObject({
					Authorization: `Bearer ${'test-device-token'.padEnd(32, 'x')}`,
				});

				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ pushSubscribed: false, smsConsented: true }),
				});
			}

			if (url === '/api/sms-subscription') {
				return Promise.resolve({ ok: true, json: () => Promise.resolve({ configured: true }) });
			}

			return Promise.resolve({ ok: true, json: () => Promise.resolve({ configured: false }) });
		});

		vi.stubGlobal('fetch', fetchMock);
		const wrapper = mountOptIn();

		await flushPromises();

		expect(wrapper.text()).toContain(
			'Text message updates are enabled for this and future visits.',
		);
		expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
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
