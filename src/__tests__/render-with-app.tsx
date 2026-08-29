import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

export type RenderWithAppOptions = {
	/** A store seeded by the test. One is built for the test when this is omitted. */
	store?: RootStore;
	/** The path the memory router starts on. */
	route?: string;
	/** Extra routes, for a test that asserts navigation actually landed somewhere. */
	routes?: { path: string; element: ReactNode }[];
};

export type RenderWithAppResult = RenderResult & {
	store: RootStore;
	/** Where the router currently is, for asserting navigation. */
	currentPath: () => string;
};

/**
 * Renders a component with the two things the real app always supplies: the root store and a
 * router.
 *
 * The store is built here rather than in `test-setup.ts` because several of its constituent
 * stores read `localStorage` synchronously in their constructor (device token, visit token, ...) —
 * building one eagerly for every test would race a test that seeds storage in its own body.
 */
export function renderWithApp(
	ui: ReactElement,
	options: RenderWithAppOptions = {},
): RenderWithAppResult {
	const store = options.store ?? new RootStore();
	const router = createMemoryRouter(
		[{ path: options.route ?? '/', element: ui }, ...(options.routes ?? [])],
		{ initialEntries: [options.route ?? '/'] },
	);

	const result = render(
		<RootStoreProvider store={store}>
			<RouterProvider router={router} />
		</RootStoreProvider>,
	);

	return { ...result, store, currentPath: () => router.state.location.pathname };
}
