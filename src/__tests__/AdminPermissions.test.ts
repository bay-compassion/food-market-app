import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The real module only configures Auth0 when the VITE_AUTH0_* variables are set, which is true on
// some machines and not others. Pin it on so these tests always take the read-the-token path.
vi.mock('../auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../auth')>()),
	auth0: null,
	isAuth0Configured: true,
}));

import { adminTranslations } from '../adminLocales';
import AdminDashboard from '../components/AdminDashboard.vue';

const t = adminTranslations.en;

/** An unsigned token carrying permissions — all the admin screens read one for. */
function tokenWith(permissions: string[]) {
	const segment = (value: unknown) =>
		btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	return `${segment({ alg: 'none', typ: 'JWT' })}.${segment({ permissions })}.`;
}

function mountDashboard(permissions: string[]) {
	// Answers each endpoint with its own shape, so a screen that opens actually renders.
	vi.stubGlobal(
		'fetch',
		vi.fn((url: string) =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url.startsWith('/api/market') && !url.includes('history')
							? { event: null, questions: [], counts: {} }
							: url.startsWith('/api/reports')
								? { rows: [] }
								: [],
					),
			} as Response),
		),
	);

	return mount(AdminDashboard, {
		props: {
			locale: 'en' as const,
			getAccessToken: () => Promise.resolve(tokenWith(permissions)),
		},
	});
}

function navigationLabels(wrapper: ReturnType<typeof mountDashboard>) {
	return wrapper.findAll('.admin-navigation button').map((button) => button.text());
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('admin navigation by permission', () => {
	it('offers a queue worker only the screens their role can open', async () => {
		const wrapper = mountDashboard(['run:queue']);

		await flushPromises();

		expect(navigationLabels(wrapper)).toEqual([t.queue, t.guestDatabase, t.historySessions]);
	});

	it('offers an administrator everything', async () => {
		const wrapper = mountDashboard([
			'run:queue',
			'manage:sessions',
			'read:reports',
			'export:guest-data',
		]);

		await flushPromises();

		expect(navigationLabels(wrapper)).toEqual([
			t.currentSession,
			t.queue,
			t.questionBank,
			t.guestDatabase,
			t.historySessions,
			t.reports,
		]);
	});

	it('lands a worker on a screen they can open, not the default one they cannot', async () => {
		const wrapper = mountDashboard(['run:queue']);

		await flushPromises();

		// `current-session` is the default view but needs manage:sessions.
		expect(wrapper.emitted('navigate')?.[0]).toEqual(['queue']);
	});

	it('explains itself to someone signed in with no role at all', async () => {
		const wrapper = mountDashboard([]);

		await flushPromises();

		expect(wrapper.text()).toContain(t.noAccess);
		expect(navigationLabels(wrapper)).toEqual([]);
	});

	it('does not request guest data a worker has no permission to read', async () => {
		mountDashboard(['read:reports']);
		await flushPromises();

		const urls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));

		expect(urls.some((url) => url.startsWith('/api/guests'))).toBe(false);
	});

	// manage:demo-data is deliberately not part of `worker` or `admin` — see docs/roles.md — so an
	// administrator holding the other four permissions should not see it either.
	it('offers the dev-mode screen only to whoever holds manage:demo-data', async () => {
		const wrapper = mountDashboard(['manage:demo-data']);

		await flushPromises();

		expect(navigationLabels(wrapper)).toEqual([t.devMode]);
	});
});
