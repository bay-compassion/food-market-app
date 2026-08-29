import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import GuestView from '../components/guest-view/GuestView.vue';
import { setReactInputValue } from '../react-bridge/testing';
import { RootStore, rootStoreKey } from '../stores/root.store';

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

function mountGuestView() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: 'guest', component: GuestView },
			{ path: '/signup', name: 'signup', component: GuestView },
		],
	});
	const rootStore = new RootStore();
	const wrapper = mount(GuestView, {
		global: { plugins: [router], provide: { [rootStoreKey as symbol]: rootStore } },
	});

	return { wrapper, rootStore };
}

/** `GuestLanguageHero`'s language picker also renders `<button>` elements, so button lookups
 *  elsewhere in the card need to search by their own text rather than by tag alone. */
function findButton(wrapper: VueWrapper, text: string) {
	return wrapper.findAll('button').find((button) => button.text() === text);
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
		vi.stubGlobal('fetch', fetchRespondingWith({}));

		// Act
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Assert
		expect(wrapper.text()).toContain('Welcome to the community food market');
		expect(wrapper.text()).toContain('Number of people in your household');
	});

	it('shows visit status and saves the visit token after a successful submission', async () => {
		// Arrange
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
		const { wrapper } = mountGuestView();

		await flushPromises();
		await setReactInputValue(wrapper.find('input[autocomplete="given-name"]'), 'Ada');
		await setReactInputValue(wrapper.find('input[autocomplete="family-name"]'), 'Lovelace');
		await setReactInputValue(wrapper.find('input[type="tel"]'), '(555) 123-4567');
		await wrapper.find('select').setValue('18-29');

		const countInputs = wrapper.findAll('input.count-other');

		await setReactInputValue(countInputs[0]!, '2');
		await setReactInputValue(countInputs[1]!, '1');
		await setReactInputValue(countInputs[2]!, '0');

		// Act
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		// Assert
		expect(wrapper.text()).toContain('You’re in the queue!');
		expect(window.localStorage.getItem('bay-compassion.visit-token')).toBe('token-1');
	});

	it('shows a waiting guest their place in line for a visit token already on the device', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		vi.stubGlobal(
			'fetch',
			fetchRespondingWith({
				visit: () => ({
					id: 'visit-1',
					status: 'waiting',
					queuePosition: 3,
					aheadOfYou: 2,
				}),
			}),
		);

		// Act
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Assert
		expect(wrapper.text()).toContain('Your place in line');
		expect(wrapper.text()).toContain('3');
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
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Assert
		expect(wrapper.text()).toContain('It’s your turn');
		expect(wrapper.find('.submission-error').exists()).toBe(false);
	});

	it('keeps polling /api/visit every 15 seconds while the visit is called', async () => {
		// Arrange
		vi.useFakeTimers();
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
		});

		vi.stubGlobal('fetch', fetchMock);
		mountGuestView();
		await flushPromises();

		const callsBefore = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		// Act
		await vi.advanceTimersByTimeAsync(15_000);

		// Assert
		const callsAfter = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		expect(callsAfter).toBeGreaterThan(callsBefore);
	});

	it('keeps polling after the component unmounts, since VisitStore lives on the shared root store', async () => {
		// Arrange
		vi.useFakeTimers();
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
		});

		vi.stubGlobal('fetch', fetchMock);
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Act
		wrapper.unmount();
		const callsAfterUnmount = fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length;

		await vi.advanceTimersByTimeAsync(15_000);

		// Assert
		expect(fetchMock.mock.calls.filter(([url]) => url === '/api/visit').length).toBeGreaterThan(
			callsAfterUnmount,
		);
	});

	it('stops polling once the root store is disposed', async () => {
		// Arrange
		vi.useFakeTimers();
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'called', queuePosition: null, aheadOfYou: null }),
		});

		vi.stubGlobal('fetch', fetchMock);
		const { rootStore } = mountGuestView();

		await flushPromises();

		// Act
		rootStore[Symbol.dispose]();
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
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Assert
		expect(window.localStorage.getItem('bay-compassion.visit-token')).toBeNull();
		expect(wrapper.text()).toContain('Welcome to the community food market');
	});

	it('cancels a visit after the guest confirms the prompt', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: (options) =>
				options?.method === 'PATCH'
					? { id: 'visit-1', status: 'cancelled' }
					: { id: 'visit-1', status: 'waiting', queuePosition: 1, aheadOfYou: 0 },
		});

		vi.stubGlobal('fetch', fetchMock);
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Act
		await findButton(wrapper, 'Cancel this visit')!.trigger('click');
		await flushPromises();

		// Assert
		const cancelCall = fetchMock.mock.calls.find(
			([url, options]) => url === '/api/visit' && options?.method === 'PATCH',
		);

		expect(cancelCall).toBeDefined();
	});

	it('does not cancel when the guest declines the confirmation prompt', async () => {
		// Arrange
		window.localStorage.setItem('bay-compassion.visit-token', 'token-1');
		const fetchMock = fetchRespondingWith({
			visit: () => ({ id: 'visit-1', status: 'waiting', queuePosition: 1, aheadOfYou: 0 }),
		});

		vi.stubGlobal('fetch', fetchMock);
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { wrapper } = mountGuestView();

		await flushPromises();

		// Act
		await findButton(wrapper, 'Cancel this visit')!.trigger('click');
		await flushPromises();

		// Assert
		const cancelCall = fetchMock.mock.calls.find(
			([url, options]) => url === '/api/visit' && options?.method === 'PATCH',
		);

		expect(cancelCall).toBeUndefined();
	});
});
