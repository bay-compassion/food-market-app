import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestView } from '../components/guest-view/GuestView';
import { RootStore } from '../stores/root.store';
import { renderWithApp } from './render-with-app';

const marketOverview = {
	event: {
		id: 'event-1',
		status: 'registration_open',
		registrationOpensAt: '2020-01-01T00:00:00.000Z',
		registrationClosesAt: '2099-01-01T00:00:00.000Z',
	},
	questions: [],
	counts: {},
};

function renderGuestView() {
	const store = new RootStore();

	return renderWithApp(<GuestView />, {
		store,
		routes: [{ path: '/signup', element: <div>signup</div> }],
	});
}

function fetchRespondingWith(handlers: {
	market?: unknown;
	visit?: (options?: RequestInit) => unknown;
}) {
	return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
		if (url === '/api/market') {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(handlers.market ?? marketOverview),
			});
		}

		if (url === '/api/visit') {
			const result = handlers.visit?.(options);

			return Promise.resolve(
				result === undefined
					? { ok: false, json: () => Promise.resolve({}) }
					: { ok: true, json: () => Promise.resolve(result) },
			);
		}

		return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
	});
}

describe('GuestView', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('renders the queue registration form when no visit token is stored', async () => {
		// Arrange
		const user = userEvent.setup();

		vi.stubGlobal('fetch', fetchRespondingWith({}));

		// Act
		const { container } = renderGuestView();

		// Assert
		await waitFor(() =>
			expect(container.textContent).toContain('Number of people in your household'),
		);
		expect(container.textContent).toContain('Welcome to the community food market');
		expect(screen.getByText('Save your information for next time')).toBeDefined();

		await user.click(screen.getByRole('button', { name: 'Save my information' }));
		expect(screen.getByText('signup')).toBeDefined();
	});

	it('shows visit status and saves the visit token after a successful submission', async () => {
		// Arrange
		const user = userEvent.setup();
		const fetchMock = vi.fn().mockImplementation((url: string) =>
			Promise.resolve(
				url === '/api/market'
					? { ok: true, json: () => Promise.resolve(marketOverview) }
					: {
							ok: true,
							json: () =>
								Promise.resolve({ id: 'visit-1', status: 'registered', visitToken: 'token-1' }),
						},
			),
		);

		vi.stubGlobal('fetch', fetchMock);
		const { container } = renderGuestView();

		await waitFor(() => expect(container.querySelector('form')).not.toBeNull());

		await user.type(container.querySelector('input[autocomplete="given-name"]')!, 'Ada');
		await user.type(container.querySelector('input[autocomplete="family-name"]')!, 'Lovelace');
		await user.type(container.querySelector('input[type="tel"]')!, '5551234567');
		await user.selectOptions(container.querySelector('select')!, '18-29');

		const countInputs = container.querySelectorAll<HTMLInputElement>('.count-other input');

		await user.type(countInputs[0]!, '2');
		await user.type(countInputs[1]!, '1');
		await user.type(countInputs[2]!, '0');

		// Act
		fireEvent.submit(container.querySelector('form')!);

		// Assert
		await waitFor(() => expect(container.textContent).toContain('You’re in the queue!'));
		expect(window.localStorage.getItem('bay-compassion.visit-token')).toBe('token-1');
	});

	it('shows a waiting guest their place in line for a visit token already on the device', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		vi.stubGlobal(
			'fetch',
			fetchRespondingWith({
				visit: () => ({ id: 'visit-1', status: 'waiting', queuePosition: 3, aheadOfYou: 2 }),
			}),
		);

		// Act
		const { container } = renderGuestView();

		// Assert
		await waitFor(() => expect(container.textContent).toContain('Your place in line'));
		expect(container.textContent).toContain('3');
	});

	it('shows the "it\'s your turn" panel once the guest is called', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		vi.stubGlobal(
			'fetch',
			fetchRespondingWith({
				visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
			}),
		);

		// Act
		const { container } = renderGuestView();

		// Assert
		await waitFor(() => expect(container.textContent).toContain('It’s your turn'));
		expect(container.querySelector('.submission-error')).toBeNull();
	});

	it('keeps polling /api/visit every 15 seconds while the visit is called', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
		});

		// Fake timers are installed before rendering: the poll interval is created during the
		// initial load, and switching clocks afterwards would leave that interval on the real one.
		vi.useFakeTimers();
		vi.stubGlobal('fetch', fetchMock);
		renderGuestView();

		await vi.runOnlyPendingTimersAsync();

		const callsBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		// Act
		await vi.advanceTimersByTimeAsync(15_000);

		// Assert
		const callsAfter = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		expect(callsAfter).toBeGreaterThan(callsBefore);
	});

	it('keeps polling after the component unmounts, since VisitStore lives on the shared root store', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
		});

		vi.useFakeTimers();
		vi.stubGlobal('fetch', fetchMock);
		const { unmount } = renderGuestView();

		await vi.runOnlyPendingTimersAsync();

		// Act
		unmount();
		const callsAfterUnmount = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		await vi.advanceTimersByTimeAsync(15_000);

		// Assert
		expect(fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length).toBeGreaterThan(
			callsAfterUnmount,
		);
	});

	it('stops polling once the root store is disposed', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
		});

		vi.useFakeTimers();
		vi.stubGlobal('fetch', fetchMock);
		const { store } = renderGuestView();

		await vi.runOnlyPendingTimersAsync();

		// Act
		store[Symbol.dispose]();
		const callsAfterDispose = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		await vi.advanceTimersByTimeAsync(30_000);

		// Assert
		expect(fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length).toBe(
			callsAfterDispose,
		);
	});

	it('clears an expired visit token and falls back to the registration form', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'expired-token');
		vi.stubGlobal('fetch', fetchRespondingWith({ visit: () => undefined }));

		// Act
		const { container } = renderGuestView();

		// Assert
		await waitFor(() =>
			expect(container.textContent).toContain('Welcome to the community food market'),
		);
		expect(window.localStorage.getItem('bay-compassion.visit-token')).toBeNull();
	});

	it('cancels a visit after the guest confirms the prompt', async () => {
		// Arrange
		const user = userEvent.setup();

		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');

		const fetchMock = fetchRespondingWith({
			visit: (options) =>
				options?.method === 'PATCH'
					? { id: 'visit-1', status: 'cancelled' }
					: { id: 'visit-1', status: 'waiting', queuePosition: 1, aheadOfYou: 0 },
		});

		vi.stubGlobal('fetch', fetchMock);
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		renderGuestView();

		// Act
		await user.click(await screen.findByRole('button', { name: 'Cancel this visit' }));

		// Assert
		await waitFor(() =>
			expect(
				fetchMock.mock.calls.find(
					([url, options]) => url === '/api/visit' && options?.method === 'PATCH',
				),
			).toBeDefined(),
		);
	});

	it('does not cancel when the guest declines the confirmation prompt', async () => {
		// Arrange
		const user = userEvent.setup();

		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');

		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'waiting', queuePosition: 1, aheadOfYou: 0 }),
		});

		vi.stubGlobal('fetch', fetchMock);
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		renderGuestView();

		// Act
		await user.click(await screen.findByRole('button', { name: 'Cancel this visit' }));

		// Assert
		const cancelCall = fetchMock.mock.calls.find(
			([url, options]) => url === '/api/visit' && options?.method === 'PATCH',
		);

		expect(cancelCall).toBeUndefined();
	});
});
