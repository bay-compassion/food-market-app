import { render, screen, within, type RenderResult } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppThemeProvider } from '../components/AppThemeProvider';
import { StaticLDProvider } from '../components/StaticLDProvider';
import { ConfirmationDrawer } from '../components/ui/ConfirmationDrawer';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

export type RenderWithAppOptions = {
	/** A store seeded by the test. One is built for the test when this is omitted. */
	store?: RootStore;
	/** The path the memory router starts on. */
	route?: string;
	/** Extra routes, for a test that asserts navigation actually landed somewhere. */
	routes?: { path: string; element: ReactNode }[];
	/** LaunchDarkly flag overrides, for a test that asserts on a flag's other state. See
	 *  `StaticLDProvider`. Every flag not listed here falls through to its reading hook's default. */
	flags?: Record<string, boolean>;
};

export type RenderWithAppResult = RenderResult & {
	store: RootStore;
	/** Where the router currently is, for asserting navigation. */
	currentPath: () => string;
};

/**
 * Renders a component with the things the real app always supplies: the MUI theme, root store,
 * router, the confirmation sheet `App` mounts for every screen under it, and a LaunchDarkly client
 * — `useBoolVariation` throws without one in its tree, same as `useRootStore()` without a
 * `RootStoreProvider`.
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
		<AppThemeProvider>
			<StaticLDProvider flags={options.flags}>
				<RootStoreProvider store={store}>
					<RouterProvider router={router} />
					<ConfirmationDrawer />
				</RootStoreProvider>
			</StaticLDProvider>
		</AppThemeProvider>,
	);

	return { ...result, store, currentPath: () => router.state.location.pathname };
}

/**
 * Answers the confirmation sheet the way a person does — by finding it on screen and pressing one
 * of its two buttons. Scoped to the sheet, because a confirming button usually repeats the label
 * of whatever opened it.
 *
 * @param user - A `userEvent` instance, or the module's own default export.
 * @param label - The button to press, from the request the component asked with.
 */
export async function answerConfirmation(
	user: Pick<UserEvent, 'click'>,
	label: string,
): Promise<void> {
	const sheet = await screen.findByRole('alertdialog');

	await user.click(within(sheet).getByRole('button', { name: label }));
}
