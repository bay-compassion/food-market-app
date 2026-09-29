import { LDReactContext, type LDReactClient } from '@launchdarkly/react-sdk';

/** A flag value a story or test can pin: the variation types this app's hooks read. */
export type StaticFlagValue = boolean | string;
import type { ReactNode } from 'react';

/**
 * A client that behaves like a LaunchDarkly project with no targeting rules: every flag reads as
 * `flags[key]` when given and otherwise falls through to whatever default its reading hook passes.
 *
 * Only implements what `useBoolVariation` and `useStringVariation` actually call (`isReady`,
 * `boolVariation`, `stringVariation`, `on`/`off`). A pinned value of the wrong type falls through to
 * the default, as LaunchDarkly itself does. Extend it if a component ever reads a flag a different
 * way (`useNumberVariation`, `useFlags`).
 */
function createStaticLDClient(flags: Record<string, StaticFlagValue>): LDReactClient {
	function variation<T extends StaticFlagValue>(
		key: string,
		defaultValue: T,
		type: 'boolean' | 'string',
	): T {
		const value = flags[key];

		return typeof value === type ? (value as T) : defaultValue;
	}

	return {
		isReady: () => true,
		boolVariation: (key: string, defaultValue: boolean) => variation(key, defaultValue, 'boolean'),
		stringVariation: (key: string, defaultValue: string) => variation(key, defaultValue, 'string'),
		on: () => {},
		off: () => {},
	} as unknown as LDReactClient;
}

/**
 * Supplies flag values without reaching LaunchDarkly. `main.tsx` mounts it when a build sets
 * `VITE_LAUNCHDARKLY_DISABLED=true`, and stories and tests mount it the same way `RootStore` is
 * seeded rather than pointed at a real backend. `flags` defaults to empty, so every flag reads as
 * its hook's own default; a story that wants a flag in its other state passes it explicitly, e.g.
 * `flags={{ 'line-position-indicator': 'none' }}`.
 *
 * This is deliberately never a silent fallback for a missing client ID: `main.tsx` refuses to start
 * without one unless LaunchDarkly was disabled on purpose.
 */
export function StaticLDProvider({
	flags = {},
	children,
}: {
	flags?: Record<string, StaticFlagValue>;
	children: ReactNode;
}) {
	return (
		<LDReactContext.Provider
			value={{ client: createStaticLDClient(flags), initializedState: 'complete' }}
		>
			{children}
		</LDReactContext.Provider>
	);
}
