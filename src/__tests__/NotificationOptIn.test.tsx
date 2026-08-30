import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationOptIn } from '../components/guest-view/identity/NotificationOptIn';
import { StorageKey } from '../services/storage.service';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

const deviceToken = 'test-device-token'.padEnd(32, 'x');

function renderOptIn() {
	// Seeded before the store is built: `GuestStore` reads the device token in its constructor.
	window.localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify(deviceToken));

	return render(
		<RootStoreProvider store={new RootStore()}>
			<NotificationOptIn />
		</RootStoreProvider>,
	);
}

beforeEach(() => {
	window.localStorage.clear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('NotificationOptIn', () => {
	it('renders neither section when push and SMS are both unconfigured', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ configured: false }) }),
		);

		const { container } = renderOptIn();

		await waitFor(() => expect(container.querySelector('.notification-consent')).not.toBeNull());

		expect(container.textContent).toBe('');
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

		const { container } = renderOptIn();

		await waitFor(() => expect(container.querySelector('.notification-consent')).not.toBeNull());

		expect(container.textContent).toBe('');
	});

	it('lets a guest consent to SMS updates and shows the enabled state', async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
			if (url === '/api/sms-subscription' && options?.method === 'POST') {
				expect(options.headers).toMatchObject({ Authorization: `Bearer ${deviceToken}` });
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
		const { container } = renderOptIn();

		const consent = await screen.findByRole('checkbox');

		expect(container.textContent).toContain('text messages from The Bay Compassion');
		expect(container.textContent).toContain('Message frequency varies');
		expect(container.textContent).toContain('Message and data rates may apply');
		expect(container.textContent).toContain('Reply STOP to unsubscribe or HELP for assistance');
		expect(container.querySelector('a[href="/privacy"]')!.textContent).toBe('Privacy Policy');
		expect(container.querySelector('a[href="/terms"]')!.textContent).toBe('Terms & Conditions');
		expect(container.querySelector('a[href="/privacy"]')!.parentElement).toBe(
			container.querySelector('a[href="/terms"]')!.parentElement,
		);
		expect(screen.getByRole('button', { name: 'Enable text updates' })).toBeDefined();
		expect(container.querySelector('button')!.disabled).toBe(true);

		await user.click(consent);
		expect(container.querySelector('button')!.disabled).toBe(false);

		await user.click(container.querySelector('button')!);

		expect(
			await screen.findByText('Text message updates are enabled for this and future visits.'),
		).toBeTruthy();
	});

	it('skips the checkbox for a guest already subscribed from a past visit', async () => {
		const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
			if (url === '/api/notification-status') {
				expect(options?.headers).toMatchObject({ Authorization: `Bearer ${deviceToken}` });

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
		const { container } = renderOptIn();

		expect(
			await screen.findByText('Text message updates are enabled for this and future visits.'),
		).toBeTruthy();
		expect(container.querySelector('input[type="checkbox"]')).toBeNull();
	});

	it('shows an error when enabling SMS fails', async () => {
		const user = userEvent.setup();

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

		const { container } = renderOptIn();

		await user.click(await screen.findByRole('checkbox'));
		await user.click(container.querySelector('button')!);

		expect(
			await screen.findByText('We could not enable text updates. Please try again.'),
		).toBeTruthy();
	});
});
