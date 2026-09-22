import { LDReactContext, type LDReactClient } from '@launchdarkly/react-sdk';
import type { ReactNode } from 'react';

/**
 * A client that behaves like a LaunchDarkly project with no targeting rules: every flag reads as
 * `flags[key]` when given and otherwise falls through to whatever default its reading hook passes.
 *
 * Only implements what `useBoolVariation` actually calls (`isReady`, `boolVariation`, `on`/`off`),
 * the one variation hook any component in this app currently uses. Extend it if a component ever
 * reads a flag a different way (`useStringVariation`, `useFlags`).
 */
function createStaticLDClient(flags: Record<string, boolean>): LDReactClient {
	return {
		isReady: () => true,
		boolVariation: (key: string, defaultValue: boolean) => flags[key] ?? defaultValue,
		on: () => {},
		off: () => {},
	} as unknown as LDReactClient;
}

/**
 * Supplies flag values without reaching LaunchDarkly. `main.tsx` mounts it when a build sets
 * `VITE_LAUNCHDARKLY_DISABLED=true`, and stories and tests mount it the same way `RootStore` is
 * seeded rather than pointed at a real backend. `flags` defaults to empty, so every flag reads as
 * its hook's own default; a story that wants a flag in its other state passes it explicitly, e.g.
 * `flags={{ 'line-position-indicator-enabled': false }}`.
 *
 * This is deliberately never a silent fallback for a missing client ID: `main.tsx` refuses to start
 * without one unless LaunchDarkly was disabled on purpose.
 */
export function StaticLDProvider({
	flags = {},
	children,
}: {
	flags?: Record<string, boolean>;
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
